import assert from "node:assert/strict";
import test from "node:test";
import { countdownCovered, fillStayedStill } from "./audit-page.mjs";

test("the reduced-motion countdown has to show 2s, then 1s, then Deleted", () => {
  assert.equal(countdownCovered(["Delete project", "Keep holding 2s", "Keep holding 1s", "Deleted"]), true);
  assert.equal(countdownCovered(["Keep holding 2s", "Deleted"]), false);
  assert.equal(countdownCovered(["Keep holding 1s", "Keep holding 2s", "Deleted"]), false);
  assert.equal(countdownCovered(["Deleted"]), false);
});

test("a still fill is none or the identity matrix", () => {
  assert.equal(fillStayedStill(["none", "matrix(1, 0, 0, 1, 0, 0)"]), true);
  assert.equal(fillStayedStill(["matrix(0.4, 0, 0, 1, 0, 0)"]), false);
});
