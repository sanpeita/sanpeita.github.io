const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTTP_PATTERN = /^https?:\/\//i;
const VALID_STATUSES = new Set(["published", "draft", "hidden"]);
const VALID_ROOMS = new Set(["profile", "works", "games", "exit"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function numericOrder(value, fallback = Number.MAX_SAFE_INTEGER) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function validateExhibit(exhibit, source = "exhibit") {
  const errors = [];
  if (!isObject(exhibit)) return { valid: false, errors: [`${source}: JSON objectではありません。`] };

  for (const key of ["id", "title", "type", "url", "description", "thumbnail", "status"]) {
    if (typeof exhibit[key] !== "string" || exhibit[key].trim() === "") errors.push(`${source}: ${key} が必要です。`);
  }
  if (typeof exhibit.id === "string" && !ID_PATTERN.test(exhibit.id)) errors.push(`${source}: idは小文字英数字とハイフンだけを使ってください。`);
  if (typeof exhibit.type === "string" && !ID_PATTERN.test(exhibit.type)) errors.push(`${source}: typeは小文字英数字とハイフンだけを使ってください。`);
  if (typeof exhibit.url === "string" && !HTTP_PATTERN.test(exhibit.url)) errors.push(`${source}: urlはhttp(s) URLにしてください。`);
  if (exhibit.repository !== undefined && (typeof exhibit.repository !== "string" || !HTTP_PATTERN.test(exhibit.repository))) errors.push(`${source}: repositoryはhttp(s) URLにしてください。`);
  if (typeof exhibit.status === "string" && !VALID_STATUSES.has(exhibit.status)) errors.push(`${source}: statusが不正です。`);
  if (!isObject(exhibit.web) || typeof exhibit.web.visible !== "boolean") errors.push(`${source}: web.visibleを真偽値で指定してください。`);
  if (!isObject(exhibit.gallery3d) || typeof exhibit.gallery3d.visible !== "boolean") errors.push(`${source}: gallery3d.visibleを真偽値で指定してください。`);
  if (isObject(exhibit.gallery3d) && !VALID_ROOMS.has(exhibit.gallery3d.room)) errors.push(`${source}: gallery3d.roomが不正です。`);

  return { valid: errors.length === 0, errors };
}

export function sortExhibits(items, view = "web") {
  return [...items].sort((a, b) => {
    if (view === "web" && Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
    const aOrder = view === "gallery3d" ? numericOrder(a.gallery3d?.order, numericOrder(a.order)) : numericOrder(a.order);
    const bOrder = view === "gallery3d" ? numericOrder(b.gallery3d?.order, numericOrder(b.order)) : numericOrder(b.order);
    return aOrder - bOrder || a.title.localeCompare(b.title, "ja");
  });
}

export function filterWebExhibits(items) {
  return sortExhibits(items.filter((item) => item.status === "published" && item.web?.visible === true), "web");
}

export function filterGalleryExhibits(items) {
  return sortExhibits(items.filter((item) => item.status === "published" && item.gallery3d?.visible === true), "gallery3d");
}

export function resolveAssetUrl(path, siteRootUrl) {
  if (HTTP_PATTERN.test(path)) return path;
  return new URL(path.replace(/^\/+/, ""), siteRootUrl).href;
}

export async function loadExhibits(manifestUrl, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("fetchが利用できません。");
  const manifestResponse = await fetchImpl(manifestUrl, { cache: "no-cache" });
  if (!manifestResponse.ok) throw new Error(`manifestを取得できませんでした (${manifestResponse.status})。`);
  const manifest = await manifestResponse.json();
  const filenames = Array.isArray(manifest) ? manifest : manifest?.exhibits;
  if (!Array.isArray(filenames) || filenames.some((name) => typeof name !== "string" || !name.endsWith(".json"))) {
    throw new Error("manifestのexhibitsはJSONファイル名の配列にしてください。");
  }

  const items = await Promise.all(filenames.map(async (filename) => {
    const exhibitUrl = new URL(filename, manifestUrl);
    const response = await fetchImpl(exhibitUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${filename}を取得できませんでした (${response.status})。`);
    const exhibit = await response.json();
    const result = validateExhibit(exhibit, filename);
    if (!result.valid) throw new Error(result.errors.join("\n"));
    return exhibit;
  }));

  const ids = new Set();
  const urls = new Set();
  for (const item of items) {
    const normalizedUrl = item.url.replace(/\/+$/, "").toLowerCase();
    if (ids.has(item.id)) throw new Error(`idが重複しています: ${item.id}`);
    if (urls.has(normalizedUrl)) throw new Error(`urlが重複しています: ${item.url}`);
    ids.add(item.id);
    urls.add(normalizedUrl);
  }
  return items;
}
