const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const sortSelect = document.getElementById('sortSelect');
const productsGrid = document.getElementById('productsGrid');
const resultsInfo = document.getElementById('resultsInfo');

const currencyFormatter = new Intl.NumberFormat('et-EE', {
  style: 'currency',
  currency: 'EUR'
});

let allProducts = [];

function createCard(product) {
  const article = document.createElement('article');
  article.className = 'product-card';
  article.setAttribute('aria-labelledby', `product-title-${product.id}`);

  const image = document.createElement('img');
  image.src = product.image;
  image.alt = `${product.name} pilt`;
  image.loading = 'lazy';
  image.decoding = 'async';

  const content = document.createElement('div');
  content.className = 'product-content';

  const title = document.createElement('h2');
  title.className = 'product-name';
  title.id = `product-title-${product.id}`;
  title.textContent = product.name;

  const category = document.createElement('p');
  category.className = 'product-category';
  category.textContent = `Kategooria: ${product.category}`;

  const description = document.createElement('p');
  description.className = 'product-description';
  description.textContent = product.shortDescription;

  const price = document.createElement('p');
  price.className = 'product-price';
  price.textContent = currencyFormatter.format(product.price);

  const action = document.createElement('a');
  action.className = 'product-action';
  action.href = '#';
  action.setAttribute('aria-label', `Vaata toodet: ${product.name}`);
  action.textContent = 'Vaata toodet';

  content.append(title, category, description, price, action);
  article.append(image, content);

  return article;
}

function render(products) {
  productsGrid.innerHTML = '';

  if (!products.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.setAttribute('role', 'status');
    emptyState.textContent = 'Ühtegi toodet ei leitud. Muuda otsingut või filtreid.';
    productsGrid.append(emptyState);
  } else {
    const fragment = document.createDocumentFragment();
    for (const product of products) {
      fragment.append(createCard(product));
    }
    productsGrid.append(fragment);
  }

  const plural = products.length === 1 ? 'toode' : 'toodet';
  resultsInfo.textContent = `Näitan ${products.length} ${plural}.`;
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedCategory = categorySelect.value;
  const sortMode = sortSelect.value;

  const filtered = allProducts
    .filter((product) => {
      const matchesQuery =
        product.name.toLowerCase().includes(query) ||
        product.shortDescription.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesQuery && matchesCategory;
    })
    .sort((a, b) => (sortMode === 'price-desc' ? b.price - a.price : a.price - b.price));

  render(filtered);
}

function buildCategoryOptions(products) {
  const categories = [...new Set(products.map((p) => p.category))].sort((a, b) =>
    a.localeCompare(b, 'et')
  );

  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);
  }
}

async function loadProducts() {
  try {
    const response = await fetch('./products.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Vigane vastus: ${response.status}`);
    }

    const products = await response.json();
    if (!Array.isArray(products)) {
      throw new Error('products.json ei ole massiiv.');
    }

    allProducts = products;
    buildCategoryOptions(allProducts);
    applyFilters();
  } catch (error) {
    console.error(error);
    resultsInfo.textContent = 'Tooteid ei õnnestunud laadida.';
  }
}

searchInput.addEventListener('input', applyFilters);
categorySelect.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);

loadProducts();
