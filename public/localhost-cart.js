(function () {
  "use strict";

  var LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
  var normalizedHost = String(window.location.hostname || "")
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  if (!LOCAL_HOSTS.has(normalizedHost) && !normalizedHost.endsWith(".localhost")) {
    return;
  }

  var STORAGE_KEY = "ida_local_cart_v1";
  var LEGACY_WIDGET_CART_KEY = "ida_local_test_cart";

  function loadCart() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function loadLegacyWidgetCart() {
    try {
      var raw = window.localStorage.getItem(LEGACY_WIDGET_CART_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      // Ignore storage write errors in private mode.
    }
    updateHeaderCartUI();
    renderWidgetMiniCart(items);
    renderLocalCartPanel();
  }

  function sanitizeNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function parsePrice(text) {
    if (!text) {
      return 0;
    }
    var normalized = String(text).replace(/[^\d,.-]/g, "").replace(",", ".");
    var parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatMoney(value) {
    var safe = sanitizeNumber(value, 0);
    return safe.toFixed(2) + "\u20ac";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toLocalHref(url) {
    try {
      var parsed = new URL(String(url || ""), window.location.origin);
      return parsed.pathname + parsed.search + parsed.hash;
    } catch (error) {
      return "/";
    }
  }

  function cartCount(items) {
    return items.reduce(function (sum, item) {
      return sum + sanitizeNumber(item.qty, 0);
    }, 0);
  }

  function cartTotal(items) {
    return items.reduce(function (sum, item) {
      return sum + sanitizeNumber(item.qty, 0) * sanitizeNumber(item.price, 0);
    }, 0);
  }

  function findItem(items, id) {
    for (var i = 0; i < items.length; i += 1) {
      if (String(items[i].id) === String(id)) {
        return items[i];
      }
    }
    return null;
  }

  function renderWidgetMiniCart(items) {
    var safeItems = Array.isArray(items) ? items : [];
    var total = cartTotal(safeItems);
    var innerHtml = "";

    if (safeItems.length === 0) {
      innerHtml =
        '<div class="ux-mini-cart-empty flex flex-row-col text-center pt pb">' +
        '<div class="ux-mini-cart-empty-icon">' +
        '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17 19" style="opacity:.1;height:80px;">' +
        '<path d="M8.5 0C6.7 0 5.3 1.2 5.3 2.7v2H2.1c-.3 0-.6.3-.7.7L0 18.2c0 .4.2.8.6.8h15.7c.4 0 .7-.3.7-.7v-.1L15.6 5.4c0-.3-.3-.6-.7-.6h-3.2v-2c0-1.6-1.4-2.8-3.2-2.8zM6.7 2.7c0-.8.8-1.4 1.8-1.4s1.8.6 1.8 1.4v2H6.7v-2zm7.5 3.4 1.3 11.5h-14L2.8 6.1h2.5v1.4c0 .4.3.7.7.7.4 0 .7-.3.7-.7V6.1h3.5v1.4c0 .4.3.7.7.7s.7-.3.7-.7V6.1h2.6z" fill-rule="evenodd" clip-rule="evenodd" fill="currentColor"></path>' +
        "</svg>" +
        "</div>" +
        '<p class="woocommerce-mini-cart__empty-message empty">Ostukorvis ei ole tooteid.</p>' +
        '<p class="return-to-shop"><a class="button primary wc-backward" href="/pood/">Tagasi poodi</a></p>' +
        "</div>";
    } else {
      var itemRows = safeItems
        .map(function (item) {
          var id = escapeHtml(item.id);
          var title = escapeHtml(item.title || ("Toode #" + id));
          var qty = Math.max(1, sanitizeNumber(item.qty, 1));
          var price = sanitizeNumber(item.price, 0);
          var lineTotal = formatMoney(qty * price);
          var href = escapeHtml(toLocalHref(item.url || "/"));
          var imageTag = item.image
            ? '<img src="' +
              escapeHtml(item.image) +
              '" alt="' +
              title +
              '" loading="lazy" decoding="async" />'
            : "";

          return (
            '<li class="woocommerce-mini-cart-item mini_cart_item">' +
            '<a href="#" class="remove remove_from_cart_button" data-remove-id="' +
            id +
            '" aria-label="Eemalda toode">×</a>' +
            '<a href="' +
            href +
            '">' +
            imageTag +
            title +
            "</a>" +
            '<span class="quantity">' +
            qty +
            " × " +
            '<span class="woocommerce-Price-amount amount"><bdi>' +
            lineTotal +
            "</bdi></span>" +
            "</span>" +
            "</li>"
          );
        })
        .join("");

      innerHtml =
        '<ul class="woocommerce-mini-cart cart_list product_list_widget">' +
        itemRows +
        "</ul>" +
        '<p class="woocommerce-mini-cart__total total"><strong>Kokku:</strong> <span class="woocommerce-Price-amount amount"><bdi>' +
        formatMoney(total) +
        "</bdi></span></p>" +
        '<p class="woocommerce-mini-cart__buttons buttons">' +
        '<a href="/ostukorv/" class="button wc-forward">Ostukorv</a>' +
        '<button type="button" class="button is-outline" data-local-cart-clear="1">Tühjenda</button>' +
        "</p>";
    }

    document.querySelectorAll("div.widget_shopping_cart_content").forEach(function (node) {
      node.innerHTML = innerHtml;
    });
  }

  function mergeLegacyWidgetCartIfNeeded() {
    var legacyItems = loadLegacyWidgetCart();
    if (legacyItems.length === 0) {
      return;
    }

    var next = loadCart();
    var changed = false;

    legacyItems.forEach(function (entry) {
      var id = String(
        entry.key || entry.id || entry.variantId || entry.handle || entry.title || ""
      ).trim();
      if (!id) {
        return;
      }

      var qty = Math.max(1, sanitizeNumber(entry.qty, 1));
      var existing = findItem(next, id);
      var parsedPrice =
        typeof entry.price === "number"
          ? sanitizeNumber(entry.price, 0)
          : parsePrice(entry.price);
      var url = entry.permalink || entry.url || "/toode/" + id + "/";

      if (existing) {
        existing.qty = sanitizeNumber(existing.qty, 0) + qty;
        if (!existing.title && entry.title) {
          existing.title = entry.title;
        }
        if (!existing.image && entry.image) {
          existing.image = entry.image;
        }
        if (!existing.url && url) {
          existing.url = url;
        }
        if (!existing.price && parsedPrice) {
          existing.price = parsedPrice;
        }
      } else {
        next.push({
          id: id,
          title: entry.title || ("Toode #" + id),
          qty: qty,
          price: parsedPrice,
          url: url,
          image: entry.image || ""
        });
      }

      changed = true;
    });

    if (changed) {
      saveCart(next);
    }

    try {
      window.localStorage.removeItem(LEGACY_WIDGET_CART_KEY);
    } catch (error) {
      // ignore
    }
  }

  function addToCart(item) {
    var items = loadCart();
    var id = String(item.id || "");
    if (!id) {
      return;
    }
    var qty = Math.max(1, sanitizeNumber(item.qty, 1));
    var existing = findItem(items, id);
    if (existing) {
      existing.qty = sanitizeNumber(existing.qty, 0) + qty;
      if (!existing.title && item.title) {
        existing.title = item.title;
      }
      if (!existing.url && item.url) {
        existing.url = item.url;
      }
      if (!existing.image && item.image) {
        existing.image = item.image;
      }
      if (!existing.price && item.price) {
        existing.price = item.price;
      }
    } else {
      items.push({
        id: id,
        title: item.title || ("Toode #" + id),
        qty: qty,
        price: sanitizeNumber(item.price, 0),
        url: item.url || "/",
        image: item.image || ""
      });
    }
    saveCart(items);
  }

  function removeFromCart(id) {
    var target = String(id);
    var items = loadCart().filter(function (item) {
      return String(item.id) !== target;
    });
    saveCart(items);
  }

  function clearCart() {
    saveCart([]);
  }

  function showToast(message) {
    var el = document.getElementById("ida-local-cart-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ida-local-cart-toast";
      el.style.position = "fixed";
      el.style.right = "16px";
      el.style.bottom = "16px";
      el.style.zIndex = "2147483647";
      el.style.maxWidth = "320px";
      el.style.padding = "10px 12px";
      el.style.borderRadius = "8px";
      el.style.background = "rgba(20,20,20,0.9)";
      el.style.color = "#fff";
      el.style.fontSize = "13px";
      el.style.lineHeight = "1.4";
      el.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = "1";
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(function () {
      el.style.opacity = "0";
    }, 2200);
  }

  function findProductContext(node) {
    if (!node || !node.closest) {
      return document;
    }
    return (
      node.closest(".product-small") ||
      node.closest("li.product") ||
      node.closest(".product") ||
      node.closest("article") ||
      document
    );
  }

  function extractProductTitle(node, context, fallbackId) {
    var aria = node.getAttribute("aria-label") || "";
    var ariaMatch = aria.match(/[“"](.+?)[”"]/);
    if (ariaMatch && ariaMatch[1]) {
      return ariaMatch[1].trim();
    }

    var selectors = [
      ".woocommerce-loop-product__title",
      ".product-title",
      ".product-name",
      "h1.product-title",
      "h2",
      "h3"
    ];
    for (var i = 0; i < selectors.length; i += 1) {
      var titleNode = context.querySelector(selectors[i]);
      if (titleNode && titleNode.textContent.trim()) {
        return titleNode.textContent.trim();
      }
    }
    return "Toode #" + fallbackId;
  }

  function extractProductPrice(context) {
    var selectors = [
      ".price .woocommerce-Price-amount bdi",
      ".price .woocommerce-Price-amount",
      ".product-price",
      ".price"
    ];
    for (var i = 0; i < selectors.length; i += 1) {
      var priceNode = context.querySelector(selectors[i]);
      if (priceNode && priceNode.textContent.trim()) {
        var parsed = parsePrice(priceNode.textContent);
        if (parsed > 0) {
          return parsed;
        }
      }
    }
    return 0;
  }

  function extractProductUrl(context) {
    var link =
      context.querySelector("a.woocommerce-LoopProduct-link") ||
      context.querySelector(".image a") ||
      context.querySelector("h2 a") ||
      context.querySelector("h3 a");
    if (!link || !link.getAttribute("href")) {
      return window.location.pathname + window.location.search;
    }
    return link.getAttribute("href");
  }

  function extractProductImage(context) {
    var image = context.querySelector("img");
    if (!image) {
      return "";
    }
    return (
      image.getAttribute("src") ||
      image.getAttribute("data-lazy-src") ||
      image.getAttribute("data-src") ||
      ""
    );
  }

  function getAddToCartIdFromUrl(url) {
    try {
      var parsed = new URL(url, window.location.origin);
      return parsed.searchParams.get("add-to-cart");
    } catch (error) {
      return null;
    }
  }

  function updateHeaderCartUI() {
    var items = loadCart();
    var count = cartCount(items);
    var total = cartTotal(items);

    document.querySelectorAll(".cart-price").forEach(function (node) {
      node.textContent = formatMoney(total);
    });

    document.querySelectorAll("[data-icon-label]").forEach(function (node) {
      node.setAttribute("data-icon-label", String(count));
    });
  }

  function parseRequestBody(body) {
    var params = new URLSearchParams();
    if (!body) {
      return params;
    }
    if (typeof body === "string") {
      return new URLSearchParams(body);
    }
    if (body instanceof URLSearchParams) {
      return body;
    }
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      body.forEach(function (value, key) {
        params.append(key, String(value));
      });
      return params;
    }
    return params;
  }

  function jsonResponse(payload) {
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
  }

  function wcFragmentsPayload() {
    var items = loadCart();
    var total = cartTotal(items);
    var fragmentContainer = document.createElement("div");
    fragmentContainer.className = "widget_shopping_cart_content";
    renderWidgetMiniCart(items);
    var sampleNode = document.querySelector("div.widget_shopping_cart_content");
    fragmentContainer.innerHTML = sampleNode ? sampleNode.innerHTML : "";
    return {
      fragments: {
        "div.widget_shopping_cart_content": fragmentContainer.outerHTML
      },
      cart_hash: String(Date.now()),
      cart_url: "/ostukorv/",
      total: formatMoney(total)
    };
  }

  function installFetchShim() {
    if (!window.fetch || window.__idaLocalCartFetchShimInstalled) {
      return;
    }
    window.__idaLocalCartFetchShimInstalled = true;
    var originalFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : input && input.url ? input.url : "";
      if (!url) {
        return originalFetch(input, init);
      }

      var parsed;
      try {
        parsed = new URL(url, window.location.origin);
      } catch (error) {
        return originalFetch(input, init);
      }

      var endpoint = parsed.searchParams.get("wc-ajax");
      if (!endpoint) {
        return originalFetch(input, init);
      }

      var normalized = endpoint.toLowerCase();
      if (normalized === "get_refreshed_fragments") {
        return jsonResponse(wcFragmentsPayload());
      }

      if (normalized === "add_to_cart") {
        var bodyParams = parseRequestBody(init && init.body);
        var productId =
          bodyParams.get("product_id") ||
          bodyParams.get("add-to-cart") ||
          parsed.searchParams.get("product_id") ||
          parsed.searchParams.get("add-to-cart");
        var quantity = Math.max(
          1,
          sanitizeNumber(
            bodyParams.get("quantity") || parsed.searchParams.get("quantity"),
            1
          )
        );
        if (productId) {
          addToCart({
            id: String(productId),
            qty: quantity,
            title: "Toode #" + productId,
            url: "/toode/" + productId + "/"
          });
        }
        return jsonResponse(
          Object.assign(
            {
              error: false
            },
            wcFragmentsPayload()
          )
        );
      }

      return originalFetch(input, init);
    };
  }

  function handleAddToCartQuery() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("add-to-cart");
    if (!id) {
      return;
    }
    var qty = Math.max(1, sanitizeNumber(params.get("quantity"), 1));
    addToCart({
      id: id,
      qty: qty,
      title: "Toode #" + id,
      url: window.location.pathname
    });

    params.delete("add-to-cart");
    params.delete("quantity");
    var search = params.toString();
    var nextUrl =
      window.location.pathname + (search ? "?" + search : "") + window.location.hash;
    window.history.replaceState({}, "", nextUrl);
    showToast("Lisatud kohalikku demo ostukorvi.");
  }

  function installClickHandlers() {
    document.addEventListener("click", function (event) {
      var removeBtn = event.target.closest(
        ".widget_shopping_cart_content .remove_from_cart_button[data-remove-id]"
      );
      if (removeBtn) {
        event.preventDefault();
        removeFromCart(removeBtn.getAttribute("data-remove-id"));
        showToast("Toode eemaldati kohalikust demo ostukorvist.");
        return;
      }

      var clearBtn = event.target.closest(
        ".widget_shopping_cart_content [data-local-cart-clear='1']"
      );
      if (clearBtn) {
        event.preventDefault();
        clearCart();
        showToast("Kohalik demo ostukorv tühjendati.");
        return;
      }

      var trigger = event.target.closest(
        "a.add_to_cart_button, a.ajax_add_to_cart, a[href*='add-to-cart=']"
      );
      if (!trigger) {
        return;
      }

      var id =
        trigger.getAttribute("data-product_id") ||
        getAddToCartIdFromUrl(trigger.getAttribute("href") || "");
      if (!id) {
        return;
      }

      event.preventDefault();
      var context = findProductContext(trigger);
      addToCart({
        id: String(id),
        qty: Math.max(1, sanitizeNumber(trigger.getAttribute("data-quantity"), 1)),
        title: extractProductTitle(trigger, context, id),
        price: extractProductPrice(context),
        url: extractProductUrl(context),
        image: extractProductImage(context)
      });
      showToast("Toode lisati kohalikku demo ostukorvi.");
    });

    document.addEventListener("submit", function (event) {
      var form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }
      var formData = new FormData(form);
      var id = formData.get("add-to-cart") || formData.get("product_id") || formData.get("id");
      if (!id) {
        return;
      }
      event.preventDefault();
      var context = findProductContext(form);
      addToCart({
        id: String(id),
        qty: Math.max(1, sanitizeNumber(formData.get("quantity"), 1)),
        title: extractProductTitle(form, context, id),
        price: extractProductPrice(context),
        url: extractProductUrl(context),
        image: extractProductImage(context)
      });
      showToast("Toode lisati kohalikku demo ostukorvi.");
    });
  }

  function ensureCartPanel() {
    if (!window.location.pathname.includes("/ostukorv")) {
      return null;
    }
    var existing = document.getElementById("ida-local-cart-panel");
    if (existing) {
      return existing;
    }

    var mountTarget =
      document.querySelector("#main") ||
      document.querySelector("main") ||
      document.querySelector(".shop-container") ||
      document.body;

    var panel = document.createElement("section");
    panel.id = "ida-local-cart-panel";
    panel.style.margin = "16px auto";
    panel.style.maxWidth = "980px";
    panel.style.padding = "16px";
    panel.style.background = "#fff";
    panel.style.border = "1px solid #ddd";
    panel.style.borderRadius = "8px";
    panel.innerHTML =
      '<h2 style="margin:0 0 8px;">Kohalik demo ostukorv (localhost)</h2>' +
      '<p style="margin:0 0 12px;color:#666;">See on lokaalne testkorv. Päris WooCommerce backend localhostis ei tööta.</p>' +
      '<div data-role="items"></div>' +
      '<div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">' +
      '<strong data-role="total"></strong>' +
      '<button type="button" data-role="clear" style="padding:8px 12px;border:1px solid #bbb;background:#f8f8f8;border-radius:6px;cursor:pointer;">Tühjenda korv</button>' +
      "</div>";

    mountTarget.prepend(panel);
    panel.addEventListener("click", function (event) {
      var removeButton = event.target.closest("[data-remove-id]");
      if (removeButton) {
        removeFromCart(removeButton.getAttribute("data-remove-id"));
        return;
      }
      if (event.target.matches("[data-role='clear']")) {
        clearCart();
      }
    });
    return panel;
  }

  function renderLocalCartPanel() {
    var panel = ensureCartPanel();
    if (!panel) {
      return;
    }
    var items = loadCart();
    var itemsContainer = panel.querySelector("[data-role='items']");
    var totalNode = panel.querySelector("[data-role='total']");

    if (!itemsContainer || !totalNode) {
      return;
    }

    if (items.length === 0) {
      itemsContainer.innerHTML = '<p style="margin:8px 0;color:#555;">Korv on tühi.</p>';
      totalNode.textContent = "Kokku: 0.00\u20ac";
      return;
    }

    itemsContainer.innerHTML = items
      .map(function (item) {
        var rowTotal = sanitizeNumber(item.qty, 0) * sanitizeNumber(item.price, 0);
        var title = item.title || ("Toode #" + item.id);
        var url = item.url || "/";
        return (
          '<div style="display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #eee;">' +
          '<a href="' + url + '" style="color:#111;text-decoration:none;">' + title + "</a>" +
          "<span>x" + sanitizeNumber(item.qty, 0) + "</span>" +
          "<span>" + formatMoney(rowTotal) + "</span>" +
          '<button type="button" data-remove-id="' +
          item.id +
          '" style="padding:6px 10px;border:1px solid #bbb;background:#f8f8f8;border-radius:6px;cursor:pointer;">Eemalda</button>' +
          "</div>"
        );
      })
      .join("");
    totalNode.textContent = "Kokku: " + formatMoney(cartTotal(items));
  }

  function bootstrap() {
    mergeLegacyWidgetCartIfNeeded();
    installFetchShim();
    installClickHandlers();
    handleAddToCartQuery();
    updateHeaderCartUI();
    renderWidgetMiniCart(loadCart());
    renderLocalCartPanel();
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) {
        updateHeaderCartUI();
        renderWidgetMiniCart(loadCart());
        renderLocalCartPanel();
      }
    });
    window.setInterval(function () {
      mergeLegacyWidgetCartIfNeeded();
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
