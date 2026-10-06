import assert from "node:assert/strict";
import { test } from "node:test";
import { fileName, isAllowed, normalizeAddress, parseAllowList, pickAttachments, tagsForRecipient } from "../src/logic.js";

test("parseAllowList splits on commas, spaces and semicolons", () => {
  assert.deepEqual(parseAllowList(" A@x.com, @Prov.ec;b@y.com\n"), ["a@x.com", "@prov.ec", "b@y.com"]);
  assert.deepEqual(parseAllowList(undefined), []);
});

test("normalizeAddress drops plus tags (Gmail auto-forward envelope)", () => {
  assert.equal(normalizeAddress("Luis+caf_=facturas=luis-dev.com@Gmail.com"), "luis@gmail.com");
  assert.equal(normalizeAddress("plain@x.com"), "plain@x.com");
});

test("isAllowed matches full addresses and exact domains", () => {
  const list = parseAllowList("luis@gmail.com, @cnt.com.ec");
  assert.ok(isAllowed(["luis+caf_=x@gmail.com"], list));
  assert.ok(isAllowed(["bounce@sendgrid.net", "facturacion@cnt.com.ec"], list));
  assert.ok(!isAllowed(["x@evil.cnt.com.ec"], list));
  assert.ok(!isAllowed(["luis@gmail.com.evil.io"], list));
  assert.ok(!isAllowed(["", "not-an-address"], list));
});

test("pickAttachments keeps PDFs and real photos, skips XML and logos", () => {
  const big = new ArrayBuffer(40 * 1024);
  const small = new ArrayBuffer(2 * 1024);
  const picked = pickAttachments([
    { filename: "factura.pdf", mimeType: "application/pdf", content: small },
    { filename: "RIDE.PDF", mimeType: "application/octet-stream", content: small },
    { filename: "factura.xml", mimeType: "application/xml", content: small },
    { filename: "logo.png", mimeType: "image/png", disposition: "inline", related: true, content: big },
    { filename: "pixel.png", mimeType: "image/png", disposition: "attachment", content: small },
    { filename: "recibo.jpg", mimeType: "image/jpeg", disposition: "attachment", content: big },
  ]);
  assert.deepEqual(picked.map((a) => a.filename), ["factura.pdf", "RIDE.PDF", "recibo.jpg"]);
});

test("fileName falls back for unnamed parts", () => {
  assert.equal(fileName({ filename: "a.pdf" }, 0), "a.pdf");
  assert.equal(fileName({ mimeType: "application/pdf" }, 1), "adjunto-2.pdf");
  assert.equal(fileName({ mimeType: "image/jpeg" }, 0), "adjunto-1.jpeg");
});

test("tagsForRecipient picks the tags of the receiving address", () => {
  const routes = '{"facturas@luis-dev.com": "12", "Facturas-Luis@luis-dev.com": "13, 14"}';
  assert.deepEqual(tagsForRecipient(routes, "facturas@luis-dev.com"), ["12"]);
  assert.deepEqual(tagsForRecipient(routes, "facturas-luis@LUIS-DEV.com"), ["13", "14"]);
  assert.deepEqual(tagsForRecipient(routes, "facturas+algo@luis-dev.com"), ["12"]);
  assert.equal(tagsForRecipient(routes, "otro@luis-dev.com"), null);
  assert.deepEqual(tagsForRecipient('{"a@x.com": ""}', "a@x.com"), []);
  assert.throws(() => tagsForRecipient("{bad", "a@x.com"), /ROUTES/);
});
