import { filterWebExhibits, loadExhibits, resolveAssetUrl } from "./exhibit-data.mjs";

const mount = document.querySelector("#exhibit-catalog");
const status = document.querySelector("#exhibit-catalog-status");
const siteRootUrl = new URL("../../", import.meta.url);
const manifestUrl = new URL("exhibits/manifest.json", siteRootUrl);
const placeholderUrl = new URL("assets/exhibits/placeholder.svg", siteRootUrl).href;

function createTag(tag) {
  const item = document.createElement("li");
  item.textContent = tag;
  return item;
}

function createCard(exhibit) {
  const article = document.createElement("article");
  article.className = `exhibit-card${exhibit.featured ? " exhibit-card-featured" : ""}`;
  article.id = `exhibit-${exhibit.id}`;
  article.dataset.exhibitId = exhibit.id;

  const imageLink = document.createElement("a");
  imageLink.className = "exhibit-card-thumb";
  imageLink.href = exhibit.url;
  imageLink.target = "_blank";
  imageLink.rel = "noopener noreferrer";
  imageLink.setAttribute("aria-label", `${exhibit.title}を開く`);
  const image = document.createElement("img");
  image.src = resolveAssetUrl(exhibit.thumbnail, siteRootUrl);
  image.alt = `${exhibit.title}のサムネイル`;
  image.loading = "lazy";
  image.addEventListener("error", () => { image.src = placeholderUrl; }, { once: true });
  imageLink.append(image);

  const body = document.createElement("div");
  body.className = "exhibit-card-body";
  const meta = document.createElement("p");
  meta.className = "exhibit-card-meta";
  meta.textContent = [exhibit.category, exhibit.type].filter(Boolean).join(" / ").toUpperCase();
  const heading = document.createElement("h3");
  heading.textContent = exhibit.title;
  const description = document.createElement("p");
  description.textContent = exhibit.shortDescription || exhibit.description;
  const tags = document.createElement("ul");
  tags.className = "exhibit-tags";
  tags.setAttribute("aria-label", "タグ");
  tags.append(...(exhibit.tags || []).map(createTag));
  const links = document.createElement("div");
  links.className = "exhibit-card-links";
  const open = document.createElement("a");
  open.className = "text-link";
  open.href = exhibit.url;
  open.target = "_blank";
  open.rel = "noopener noreferrer";
  open.textContent = "作品を開く ↗";
  links.append(open);
  if (exhibit.repository && exhibit.repository !== exhibit.url) {
    const repository = document.createElement("a");
    repository.href = exhibit.repository;
    repository.target = "_blank";
    repository.rel = "noopener noreferrer";
    repository.textContent = "コード ↗";
    links.append(repository);
  }
  body.append(meta, heading, description);
  if (tags.childElementCount > 0) body.append(tags);
  body.append(links);
  article.append(imageLink, body);
  return article;
}

async function renderCatalog() {
  if (!mount) return;
  try {
    const items = filterWebExhibits(await loadExhibits(manifestUrl));
    mount.replaceChildren(...items.map(createCard));
    status.textContent = `${items.length}作品を掲載しています。`;
    document.documentElement.dataset.exhibitCatalogReady = "true";
  } catch (error) {
    console.error("作品カタログを読み込めませんでした。", error);
    status.textContent = "作品カタログを読み込めませんでした。時間をおいて再読み込みしてください。";
    mount.replaceChildren();
    document.documentElement.dataset.exhibitCatalogReady = "error";
  }
}

renderCatalog();
