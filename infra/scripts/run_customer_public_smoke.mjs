import assert from "node:assert/strict";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const bodyText = await response.text();

  let json;
  try {
    json = bodyText ? JSON.parse(bodyText) : null;
  } catch (error) {
    throw new Error(
      `Expected JSON from ${url}, received: ${bodyText || "<empty body>"} (${error})`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Request to ${url} failed with ${response.status}: ${JSON.stringify(json)}`,
    );
  }

  return json;
}

async function fetchWithRetry(url, init, attempts = 5) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchJson(url, init);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError;
}

async function main() {
  const appBaseUrl = requireEnv("APP_BASE_URL").replace(/\/$/, "");
  const restaurantId = requireEnv("SMOKE_RESTAURANT_ID");
  const tableId = requireEnv("SMOKE_TABLE_ID");
  const subdomain = requireEnv("SMOKE_SUBDOMAIN");
  const guestCount = Number(process.env.SMOKE_GUEST_COUNT ?? "3");

  const homepageUrl = new URL("/api/v1/restaurant/data", appBaseUrl);
  homepageUrl.searchParams.set("subdomain", subdomain);
  homepageUrl.searchParams.set("includeMenu", "1");

  const homepage = await fetchWithRetry(homepageUrl);

  assert.equal(homepage.restaurant.id, restaurantId);
  assert.equal(homepage.restaurant.subdomain, subdomain);
  assert.equal(homepage.restaurant.name, "Smoke Test Shokudo");
  assert.ok(Array.isArray(homepage.owners), "owners should be an array");
  assert.equal(homepage.owners.length, 1);
  assert.equal(homepage.owners[0].name, "Smoke Test Owner");
  assert.ok(Array.isArray(homepage.gallery), "gallery should be an array");
  assert.equal(homepage.gallery.length, 1);
  assert.equal(homepage.gallery[0].is_hero, true);
  assert.ok(Array.isArray(homepage.signature_dishes), "signature dishes should be an array");
  assert.equal(homepage.signature_dishes.length, 1);
  assert.ok(Array.isArray(homepage.menu), "menu should be an array");
  assert.equal(homepage.menu.length, 1);
  assert.equal(homepage.menu[0].name_en, "Chef Specials");
  assert.ok(Array.isArray(homepage.menu[0].menu_items), "category menu_items should be an array");
  assert.equal(homepage.menu[0].menu_items.length, 1);
  assert.equal(homepage.menu[0].menu_items[0].name_en, "Smoked Pho");

  const sessionUrl = new URL("/api/v1/customer/session/create", appBaseUrl);
  const sessionRequest = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      restaurantId,
      tableId,
      guests: guestCount,
    }),
  };

  const firstSession = await fetchJson(sessionUrl, sessionRequest);

  assert.equal(firstSession.success, true);
  assert.equal(firstSession.isNewSession, true);
  assert.equal(firstSession.tableNumber, "T1");
  assert.equal(firstSession.guestCount, guestCount);
  assert.match(firstSession.sessionId, /^[0-9a-f-]{36}$/i);
  assert.match(firstSession.orderId, /^[0-9a-f-]{36}$/i);
  assert.equal(typeof firstSession.sessionCode, "string");
  assert.equal(firstSession.sessionCode.length, 8);
  assert.equal(firstSession.passcode, firstSession.sessionCode);

  const secondSession = await fetchJson(sessionUrl, sessionRequest);

  assert.equal(secondSession.success, true);
  assert.equal(secondSession.isNewSession, false);
  assert.equal(secondSession.sessionId, firstSession.sessionId);
  assert.equal(secondSession.orderId, firstSession.orderId);
  assert.equal(secondSession.guestCount, guestCount);
  assert.equal(secondSession.sessionCode, firstSession.sessionCode);

  console.log("Customer public smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
