/*
 * Recon panel demo - mini runtime.
 *
 * index.html is written as a template: {{holes}}, <sc-if>, <sc-for> and a
 * `class Component extends DCLogic` block that returns the values to show.
 * This file turns that template into a working page in any browser, with no
 * build step and no dependencies. It is only for the clickable demo; the
 * real app will be built with HubSpot UI components.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var WHOLE_HOLE = /^\s*\{\{\s*([\w.$]+)\s*\}\}\s*$/;
  var ANY_HOLE = /\{\{\s*([\w.$]+)\s*\}\}/g;

  // Hide the raw template until it is rendered.
  var hide = document.createElement('style');
  hide.textContent = 'x-dc{display:none}';
  document.head.appendChild(hide);

  function DCLogic() {
    this.props = {};
    this.state = null;
  }
  DCLogic.prototype.setState = function (partial) {
    this.state = Object.assign({}, this.state || {}, partial);
    if (this.__schedule) this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () {
    if (this.__schedule) this.__schedule();
  };

  // Look a dotted path up in the loop scopes first, then in the render values.
  function lookup(path, scopes, vals) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    var parts = path.split('.');
    var base;
    var found = false;
    for (var i = scopes.length - 1; i >= 0; i--) {
      if (Object.prototype.hasOwnProperty.call(scopes[i], parts[0])) {
        base = scopes[i][parts[0]];
        found = true;
        break;
      }
    }
    if (!found) base = vals[parts[0]];
    for (var j = 1; j < parts.length; j++) {
      if (base === null || base === undefined) return undefined;
      base = base[parts[j]];
    }
    return base;
  }

  function fill(text, scopes, vals) {
    return text.replace(ANY_HOLE, function (_, path) {
      var v = lookup(path, scopes, vals);
      return v === null || v === undefined ? '' : String(v);
    });
  }

  // Template node -> list of virtual nodes.
  function build(node, scopes, vals, inSvg, out) {
    if (node.nodeType === 3) {
      out.push({ text: fill(node.nodeValue, scopes, vals) });
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    var i;

    if (tag === 'sc-if') {
      var cond = node.getAttribute('value') || '';
      var m = cond.match(WHOLE_HOLE);
      if (m && lookup(m[1], scopes, vals)) {
        for (i = 0; i < node.childNodes.length; i++) build(node.childNodes[i], scopes, vals, inSvg, out);
      }
      return;
    }

    if (tag === 'sc-for') {
      var lm = (node.getAttribute('list') || '').match(WHOLE_HOLE);
      var list = lm ? lookup(lm[1], scopes, vals) : [];
      var name = node.getAttribute('as') || 'item';
      (list || []).forEach(function (item, index) {
        var scope = { $index: index };
        scope[name] = item;
        var next = scopes.concat([scope]);
        for (var k = 0; k < node.childNodes.length; k++) build(node.childNodes[k], next, vals, inSvg, out);
      });
      return;
    }

    var svg = inSvg || tag === 'svg';
    var vn = { tag: tag, svg: svg, attrs: {}, props: {}, events: {}, children: [] };

    for (i = 0; i < node.attributes.length; i++) {
      var attr = node.attributes[i];
      var an = attr.name;
      var av = attr.value;
      if (an.indexOf('hint-') === 0) continue;
      var whole = av.match(WHOLE_HOLE);
      if (an.indexOf('on') === 0 && whole) {
        var type = an.slice(2).toLowerCase();
        if (type === 'change') type = 'input';
        var handler = lookup(whole[1], scopes, vals);
        if (typeof handler === 'function') vn.events[type] = handler;
        continue;
      }
      if (whole) {
        var raw = lookup(whole[1], scopes, vals);
        if (an === 'value') { vn.props.value = raw === null || raw === undefined ? '' : String(raw); continue; }
        if (an === 'disabled') { vn.props.disabled = !!raw; continue; }
        if (raw === false || raw === null || raw === undefined) continue;
        vn.attrs[an] = raw === true ? '' : String(raw);
        continue;
      }
      vn.attrs[an] = fill(av, scopes, vals);
    }

    for (i = 0; i < node.childNodes.length; i++) build(node.childNodes[i], scopes, vals, svg, vn.children);
    out.push(vn);
  }

  function listen(el, type) {
    el.__bound = el.__bound || {};
    if (el.__bound[type]) return;
    el.__bound[type] = true;
    el.addEventListener(type, function (e) {
      var fn = el.__events && el.__events[type];
      if (fn) fn(e);
    });
  }

  function update(el, vn) {
    var i;
    var names = [];
    for (i = 0; i < el.attributes.length; i++) names.push(el.attributes[i].name);
    names.forEach(function (n) {
      if (!Object.prototype.hasOwnProperty.call(vn.attrs, n)) el.removeAttribute(n);
    });
    Object.keys(vn.attrs).forEach(function (n) {
      if (el.getAttribute(n) !== vn.attrs[n]) el.setAttribute(n, vn.attrs[n]);
    });
    if (Object.prototype.hasOwnProperty.call(vn.props, 'value') && el.value !== vn.props.value) el.value = vn.props.value;
    if (Object.prototype.hasOwnProperty.call(vn.props, 'disabled')) el.disabled = vn.props.disabled;
    else if (el.disabled) el.disabled = false;
    el.__events = vn.events;
    Object.keys(vn.events).forEach(function (t) { listen(el, t); });
  }

  function create(vn) {
    if (vn.text !== undefined) return document.createTextNode(vn.text);
    var el = vn.svg ? document.createElementNS(SVG_NS, vn.tag) : document.createElement(vn.tag);
    update(el, vn);
    vn.children.forEach(function (c) { el.appendChild(create(c)); });
    return el;
  }

  // Change the live page in place, so inputs keep focus and animations keep running.
  function patch(parent, kids) {
    for (var i = 0; i < kids.length; i++) {
      var vn = kids[i];
      var old = parent.childNodes[i];
      if (!old) { parent.appendChild(create(vn)); continue; }
      if (vn.text !== undefined) {
        if (old.nodeType === 3) { if (old.nodeValue !== vn.text) old.nodeValue = vn.text; }
        else parent.replaceChild(create(vn), old);
      } else if (old.nodeType === 1 && old.localName === vn.tag) {
        update(old, vn);
        patch(old, vn.children);
      } else {
        parent.replaceChild(create(vn), old);
      }
    }
    while (parent.childNodes.length > kids.length) parent.removeChild(parent.lastChild);
  }

  function start() {
    var tpl = document.querySelector('x-dc');
    var script = document.querySelector('script[type="text/x-dc"]');
    if (!tpl || !script) return;

    // <helmet> holds the fonts and the global styles.
    var helmet = tpl.querySelector('helmet');
    if (helmet) {
      while (helmet.firstChild) document.head.appendChild(helmet.firstChild);
      helmet.parentNode.removeChild(helmet);
    }

    var roots = Array.prototype.slice.call(tpl.childNodes);
    tpl.parentNode.removeChild(tpl);

    var Component = new Function('DCLogic', script.textContent + '\nreturn Component;')(DCLogic);
    var instance = new Component();

    var propDefs = {};
    try { propDefs = JSON.parse(script.getAttribute('data-props') || '{}'); } catch (e) { propDefs = {}; }
    Object.keys(propDefs).forEach(function (k) {
      if (k.charAt(0) !== '$' && propDefs[k] && propDefs[k].default !== undefined) instance.props[k] = propDefs[k].default;
    });

    var mount = document.createElement('div');
    mount.id = 'recon-demo';
    document.body.appendChild(mount);

    var queued = false;
    function render() {
      queued = false;
      var vals = instance.renderVals();
      var kids = [];
      roots.forEach(function (n) { build(n, [], vals, false, kids); });
      patch(mount, kids);
    }
    instance.__schedule = function () {
      if (queued) return;
      queued = true;
      Promise.resolve().then(render);
    };

    render();
    if (typeof instance.componentDidMount === 'function') instance.componentDidMount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
