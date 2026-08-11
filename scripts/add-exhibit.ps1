[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^https?://')]
  [string]$Url,
  [string]$Id,
  [string]$Title,
  [string]$Description,
  [string]$Repository,
  [ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')]
  [string]$Type = 'webapp',
  [string]$Category = 'webapp',
  [string[]]$Tags = @(),
  [string]$Thumbnail = 'assets/exhibits/placeholder.svg',
  [ValidateSet('profile', 'works', 'games', 'exit')]
  [string]$Room = 'works',
  [ValidateRange(-1, 2147483647)]
  [int]$Order = -1,
  [ValidateRange(-1, 2147483647)]
  [int]$GalleryOrder = -1,
  [switch]$Featured,
  [ValidateSet('published', 'draft', 'hidden')]
  [string]$Status = 'published',
  [bool]$WebVisible = $true,
  [bool]$Gallery3dVisible = $true,
  [switch]$SkipUrlCheck,
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

function ConvertTo-Slug([string]$Value) {
  $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
  $ascii = -join ($normalized.ToCharArray() | Where-Object { [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne [Globalization.UnicodeCategory]::NonSpacingMark })
  $slug = ($ascii.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
  if ([string]::IsNullOrWhiteSpace($slug)) { return 'exhibit-' + (Get-Date -Format 'yyyyMMddHHmmss') }
  return $slug
}

function Get-MetaContent([string]$Html, [string]$Name) {
  $escaped = [Regex]::Escape($Name)
  $patterns = @(
    ('(?is)<meta[^>]+(?:name|property)\s*=\s*[''"]{0}[''"][^>]+content\s*=\s*[''"]([^''"]+)[''"]' -f $escaped),
    ('(?is)<meta[^>]+content\s*=\s*[''"]([^''"]+)[''"][^>]+(?:name|property)\s*=\s*[''"]{0}[''"]' -f $escaped)
  )
  foreach ($pattern in $patterns) {
    $match = [Regex]::Match($Html, $pattern)
    if ($match.Success) { return [Net.WebUtility]::HtmlDecode($match.Groups[1].Value.Trim()) }
  }
  return $null
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $encoding = New-Object Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($Path, $Content.TrimEnd() + [Environment]::NewLine, $encoding)
}

function Normalize-Url([string]$Value) {
  return ([Uri]$Value).AbsoluteUri.TrimEnd('/').ToLowerInvariant()
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$exhibitsDirectory = Join-Path $RepoRoot 'exhibits'
$manifestPath = Join-Path $exhibitsDirectory 'manifest.json'
$schemaPath = Join-Path $exhibitsDirectory 'schema.json'
if (-not (Test-Path -LiteralPath $manifestPath) -or -not (Test-Path -LiteralPath $schemaPath)) {
  throw "exhibits/manifest.json or exhibits/schema.json was not found: $RepoRoot"
}

$metadataTitle = $null
$metadataDescription = $null
if (-not $SkipUrlCheck) {
  Write-Host "[1/6] Checking URL: $Url"
  $response = Invoke-WebRequest -Uri $Url -MaximumRedirection 5 -TimeoutSec 20 -UseBasicParsing
  if ([int]$response.StatusCode -lt 200 -or [int]$response.StatusCode -ge 400) { throw "URL did not return a successful response: HTTP $($response.StatusCode)" }
  $titleMatch = [Regex]::Match($response.Content, '(?is)<title[^>]*>(.*?)</title>')
  if ($titleMatch.Success) { $metadataTitle = [Net.WebUtility]::HtmlDecode(($titleMatch.Groups[1].Value -replace '\s+', ' ').Trim()) }
  $metadataDescription = Get-MetaContent $response.Content 'og:description'
  if (-not $metadataDescription) { $metadataDescription = Get-MetaContent $response.Content 'description' }
  Write-Host "      HTTP $([int]$response.StatusCode)"
} else {
  Write-Host "[1/6] Skipped URL check."
}

$uri = [Uri]$Url
if (-not $Id) {
  $segments = @($uri.AbsolutePath.Trim('/') -split '/' | Where-Object { $_ })
  $candidate = if ($segments.Count -gt 0) { $segments[-1] } else { $uri.Host.Split('.')[0] }
  $Id = ConvertTo-Slug $candidate
} else {
  $Id = ConvertTo-Slug $Id
}
if (-not $Title) { $Title = if ($metadataTitle) { $metadataTitle } else { $Id } }
if (-not $Description) { $Description = if ($metadataDescription) { $metadataDescription } else { "Public page for $Title." } }
$shortDescription = if ($Description.Length -le 90) { $Description } else { $Description.Substring(0, 87).TrimEnd() + '...' }

Write-Host "[2/6] Checking for duplicate IDs and URLs."
$manifest = Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json
$filenames = if ($manifest -is [Array]) { @($manifest) } else { @($manifest.exhibits) }
$existing = foreach ($filename in $filenames) {
  $path = Join-Path $exhibitsDirectory $filename
  if (-not (Test-Path -LiteralPath $path)) { throw "Manifest entry was not found: $filename" }
  Get-Content -Raw -Encoding UTF8 $path | ConvertFrom-Json
}
if ($existing | Where-Object { $_.id -eq $Id }) { throw "ID '$Id' is already registered." }
$normalizedUrl = Normalize-Url $Url
if ($existing | Where-Object { (Normalize-Url $_.url) -eq $normalizedUrl }) { throw "URL '$Url' is already registered." }

if ($Order -lt 0) {
  $maxOrder = @($existing | ForEach-Object { if ($null -ne $_.order) { [int]$_.order } } | Measure-Object -Maximum).Maximum
  $Order = if ($null -eq $maxOrder) { 10 } else { ([Math]::Floor([int]$maxOrder / 10) + 1) * 10 }
}
if ($GalleryOrder -lt 0) {
  $maxGalleryOrder = @($existing | Where-Object { $_.gallery3d.room -eq $Room } | ForEach-Object { if ($null -ne $_.gallery3d.order) { [int]$_.gallery3d.order } } | Measure-Object -Maximum).Maximum
  $GalleryOrder = if ($null -eq $maxGalleryOrder) { 1 } else { [int]$maxGalleryOrder + 1 }
}

$relativeThumbnailPath = $Thumbnail -replace '/', [IO.Path]::DirectorySeparatorChar
if ($Thumbnail -notmatch '^https?://' -and -not (Test-Path -LiteralPath (Join-Path $RepoRoot $relativeThumbnailPath))) {
  throw "Thumbnail was not found: $Thumbnail"
}

Write-Host "[3/6] Building exhibit JSON: $Id"
$ordered = [ordered]@{
  id = $Id
  title = $Title
  type = $Type
  url = ([Uri]$Url).AbsoluteUri
}
if ($Repository) { $ordered.repository = ([Uri]$Repository).AbsoluteUri }
$ordered.thumbnail = $Thumbnail -replace '\\', '/'
$ordered.description = $Description
$ordered.shortDescription = $shortDescription
$ordered.category = $Category
$ordered.tags = @($Tags | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
$ordered.createdAt = Get-Date -Format 'yyyy-MM-dd'
$ordered.updatedAt = Get-Date -Format 'yyyy-MM-dd'
$ordered.featured = [bool]$Featured
$ordered.order = $Order
$ordered.status = $Status
$ordered.web = [ordered]@{ visible = $WebVisible }
$ordered.gallery3d = [ordered]@{ visible = $Gallery3dVisible; room = $Room; order = $GalleryOrder }
$exhibit = [pscustomobject]$ordered

$required = 'id', 'title', 'type', 'url', 'description', 'thumbnail', 'status', 'web', 'gallery3d'
foreach ($field in $required) {
  if ($null -eq $exhibit.$field -or ($exhibit.$field -is [string] -and [string]::IsNullOrWhiteSpace($exhibit.$field))) { throw "JSON validation failed: $field" }
}
if ($exhibit.id -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') { throw 'JSON validation failed: id' }
if ($exhibit.status -notin @('published', 'draft', 'hidden')) { throw 'JSON validation failed: status' }

$filename = "$Id.json"
$outputPath = Join-Path $exhibitsDirectory $filename
Write-Host "[4/6] Writing JSON: exhibits/$filename"
Write-Utf8NoBom $outputPath ($exhibit | ConvertTo-Json -Depth 8)

Write-Host '[5/6] Updating manifest.'
$updatedFilenames = @($filenames + $filename | Sort-Object -Unique)
if ($manifest -is [Array]) {
  $updatedManifest = $updatedFilenames
} else {
  $manifest.exhibits = $updatedFilenames
  $updatedManifest = $manifest
}
Write-Utf8NoBom $manifestPath ($updatedManifest | ConvertTo-Json -Depth 8)

Write-Host '[6/6] Validating written JSON and manifest.'
$written = Get-Content -Raw -Encoding UTF8 $outputPath | ConvertFrom-Json
$writtenManifest = Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json
$writtenFilenames = if ($writtenManifest -is [Array]) { @($writtenManifest) } else { @($writtenManifest.exhibits) }
if ($written.id -ne $Id -or $filename -notin $writtenFilenames) { throw 'Post-write validation failed.' }

Write-Host ''
Write-Host 'OK URL check / metadata retrieval'
Write-Host "OK Exhibit JSON: exhibits/$filename"
Write-Host 'OK Manifest updated'
Write-Host "OK Web visible: $WebVisible"
Write-Host "OK 3D visible: $Gallery3dVisible / room=$Room / order=$GalleryOrder"
Write-Host ''
Write-Host 'Next check: node --test tests/*.test.cjs'
Write-Output $outputPath
