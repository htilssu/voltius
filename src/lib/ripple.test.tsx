import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TOUCH_SLOP_PX, installRipples, rippleCircle, rippleSurface, rippleTarget } from "./ripple";
import { stubAnimate, unstubAnimate } from "@/test/stubAnimate";

const pointer = (type: string, target: Element, x = 10, y = 10, extra: PointerEventInit = {}) => {
  // jsdom has no PointerEvent constructor: a MouseEvent with the pointer fields is enough here.
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.assign(e, { pointerId: 1, isPrimary: true, ...extra });
  target.dispatchEvent(e);
};

describe("rippleCircle", () => {
  it("is centred on the touch and reaches the farthest corner", () => {
    const c = rippleCircle(100, 40, 10, 10);
    const r = Math.hypot(90, 30);
    expect(c).toEqual({ size: r * 2, left: 10 - r, top: 10 - r });
  });
});

describe("rippleTarget", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="b"><span id="inner">x</span></button>
      <button id="d" disabled>x</button>
      <div class="xterm"><button id="t">x</button></div>
      <div data-no-ripple><button id="o">x</button></div>
      <div data-ripple id="r">row</div>
      <input id="i" />
      <p id="p">text</p>`;
  });
  const $ = (id: string) => document.getElementById(id);

  it("finds the tappable control from a descendant", () => {
    expect(rippleTarget($("inner"))).toBe($("b"));
    expect(rippleTarget($("r"))).toBe($("r"));
  });

  it("skips disabled controls, the terminal, text fields, opted-out subtrees and plain content", () => {
    for (const id of ["d", "t", "o", "i", "p"]) expect(rippleTarget($(id))).toBeNull();
  });
});

describe("installRipples", () => {
  let uninstall: () => void;
  beforeEach(() => {
    document.body.innerHTML = `<button id="b">Row</button>`;
    stubAnimate();
    uninstall = installRipples(document);
  });
  afterEach(() => {
    uninstall();
    unstubAnimate();
  });
  const b = () => document.getElementById("b")!;
  const layer = () => b().querySelector<HTMLElement>(":scope > .vt-ripple");

  it("adds a pressed state layer and a ripple on touch-down", () => {
    pointer("pointerdown", b());
    expect(layer()).not.toBeNull();
    expect(layer()!.dataset.pressed).toBe("");
    expect(layer()!.querySelector("span")).not.toBeNull();
    expect(b().style.position).toBe("relative"); // static controls become the ripple's box
  });

  it("drops the press when the pointer moves past the touch slop (a scroll)", () => {
    pointer("pointerdown", b());
    pointer("pointermove", b(), 10, 10 + TOUCH_SLOP_PX + 1);
    expect(layer()!.dataset.pressed).toBeUndefined();
  });

  it("keeps the press for a small wobble, releases on pointerup", () => {
    pointer("pointerdown", b());
    pointer("pointermove", b(), 12, 13);
    expect(layer()!.dataset.pressed).toBe("");
    pointer("pointerup", b(), 12, 13);
    expect(layer()!.dataset.pressed).toBeUndefined();
  });

  it("ignores secondary pointers", () => {
    pointer("pointerdown", b(), 10, 10, { isPrimary: false });
    expect(layer()).toBeNull();
  });
});

describe("data-ripple-target (M3 navigation bar pill)", () => {
  let uninstall: () => void;
  beforeEach(() => {
    document.body.innerHTML = `<button id="item"><span id="pill" data-ripple-target><i id="icon">i</i></span><span id="label">Hosts</span></button><button id="plain">x</button>`;
    const pill = document.getElementById("pill")!;
    pill.getBoundingClientRect = () => ({ left: 20, top: 12, width: 64, height: 32, right: 84, bottom: 44, x: 20, y: 12, toJSON: () => ({}) });
    stubAnimate();
    uninstall = installRipples(document);
  });
  afterEach(() => {
    uninstall();
    unstubAnimate();
  });
  const $ = (id: string) => document.getElementById(id)!;

  it("resolves the surface to the marked descendant, else the control", () => {
    expect(rippleSurface($("item"))).toBe($("pill"));
    expect(rippleSurface($("plain"))).toBe($("plain"));
  });

  it("renders the press inside the pill wherever the item is touched, ripple centred on the pill", () => {
    pointer("pointerdown", $("label"), 50, 70); // on the label, below the pill
    expect($("item").querySelector(":scope > .vt-ripple")).toBeNull();
    const layer = $("pill").querySelector<HTMLElement>(":scope > .vt-ripple");
    expect(layer).not.toBeNull();
    expect(layer!.dataset.pressed).toBe("");
    const c = rippleCircle(64, 32, 32, 16);
    const wave = layer!.querySelector<HTMLElement>("span")!;
    expect(wave.style.width).toBe(`${c.size}px`);
    expect(wave.style.left).toBe(`${c.left}px`);
    expect(wave.style.top).toBe(`${c.top}px`);
    pointer("pointerup", $("label"), 50, 70);
    expect(layer!.dataset.pressed).toBeUndefined();
  });
});
