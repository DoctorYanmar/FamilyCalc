/**
 * Layout audit script — run in the browser console or via Chrome DevTools.
 *
 * Checks every .card section for:
 *   1. Children touching card borders (< min gap)
 *   2. Sibling inputs/selects with mismatched widths or right-edge misalignment
 *   3. Text elements touching their parent's borders
 *   4. Elements overflowing the viewport horizontally
 *
 * Usage:
 *   - Paste into browser console, or
 *   - Via Claude's mcp__claude-in-chrome__javascript_tool
 *
 * Returns a JSON report: { pass: boolean, issues: [...] }
 */
(function layoutAudit() {
  var MIN_GAP = 10;
  var issues = [];

  function tag(el) {
    var cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.split(/\s+/)[0]
      : '';
    return el.tagName + cls;
  }

  function txt(el) {
    return (el.textContent || '').substring(0, 30).replace(/\s+/g, ' ').trim();
  }

  // 1. Card border proximity — children inside .card should not touch edges
  var cards = document.querySelectorAll('.card');
  for (var ci = 0; ci < cards.length; ci++) {
    var card = cards[ci];
    var cr = card.getBoundingClientRect();
    var title = card.querySelector('h2');
    var cardName = title ? txt(title) : '(card ' + ci + ')';

    // Check .card-body or direct content children
    var body = card.querySelector('.card-body');
    var container = body || card;
    var containerRect = container.getBoundingClientRect();

    var children = container.children;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var r = child.getBoundingClientRect();
      if (r.width < 20 || r.height < 8) continue;

      var left = Math.round(r.left - containerRect.left);
      var right = Math.round(containerRect.right - r.right);
      var bottom = Math.round(containerRect.bottom - r.bottom);

      if (left < MIN_GAP && r.width < containerRect.width * 0.95) {
        issues.push({ card: cardName, el: tag(child), check: 'left-gap', gap: left, min: MIN_GAP });
      }
      if (right < MIN_GAP && r.width < containerRect.width * 0.95) {
        issues.push({ card: cardName, el: tag(child), check: 'right-gap', gap: right, min: MIN_GAP });
      }
      // Only flag bottom for the LAST child
      if (i === children.length - 1 && bottom < MIN_GAP) {
        issues.push({ card: cardName, el: tag(child), check: 'bottom-gap', gap: bottom, min: MIN_GAP });
      }
    }
  }

  // 2. Input/select alignment within form-section containers
  //    Skip list-of-items sections (Goals) — their multi-column grid
  //    uses intentionally different widths per column.
  var formContainers = document.querySelectorAll('.inst-row, .card-body');
  for (var fi = 0; fi < formContainers.length; fi++) {
    var fc = formContainers[fi];
    // Skip Goals card-body (list-of-items has its own alignment rules)
    if (fc.closest('.card') && fc.closest('.card').querySelector('.goals-list')) continue;
    var controls = fc.querySelectorAll('.input, .select');
    if (controls.length < 2) continue;

    // Collect right edges of controls (excluding full-width name inputs)
    var edges = [];
    for (var j = 0; j < controls.length; j++) {
      var ctrl = controls[j];
      var ctrlRect = ctrl.getBoundingClientRect();
      // Skip full-width inputs (name fields) and hidden controls
      if (ctrlRect.width > 500 || ctrlRect.height < 5) continue;
      edges.push({ el: tag(ctrl), right: Math.round(ctrlRect.right), width: Math.round(ctrlRect.width), val: ctrl.value || txt(ctrl) });
    }

    if (edges.length < 2) continue;

    // Check all right edges match
    var refRight = edges[0].right;
    for (var k = 1; k < edges.length; k++) {
      var drift = Math.abs(edges[k].right - refRight);
      if (drift > 2) {
        issues.push({
          container: tag(fc),
          check: 'right-edge-misalign',
          ref: edges[0].el + ' @' + refRight,
          misaligned: edges[k].el + ' @' + edges[k].right,
          drift: drift
        });
      }
    }

    // Check all widths match
    var refWidth = edges[0].width;
    for (var m = 1; m < edges.length; m++) {
      var wDrift = Math.abs(edges[m].width - refWidth);
      if (wDrift > 2) {
        issues.push({
          container: tag(fc),
          check: 'width-mismatch',
          ref: edges[0].el + ' w=' + refWidth,
          mismatched: edges[m].el + ' w=' + edges[m].width,
          drift: wDrift
        });
      }
    }
  }

  // 3. Viewport overflow — any element extending past the right edge
  var vw = document.documentElement.clientWidth;
  var allEls = document.querySelectorAll('*');
  for (var vi = 0; vi < allEls.length; vi++) {
    var el = allEls[vi];
    var elRect = el.getBoundingClientRect();
    if (elRect.width < 20) continue;
    if (elRect.right > vw + 2) {
      issues.push({
        check: 'viewport-overflow',
        el: tag(el),
        text: txt(el),
        overflowPx: Math.round(elRect.right - vw)
      });
      break; // one is enough to flag the issue
    }
  }

  // 4. Text touching parent borders (p, span, footer inside cards)
  var textEls = document.querySelectorAll('.card p, .card footer, .card .zero-body, .card .sav-foot, .card .totals');
  for (var ti = 0; ti < textEls.length; ti++) {
    var tel = textEls[ti];
    var tr = tel.getBoundingClientRect();
    var pr = tel.parentElement.getBoundingClientRect();
    if (tr.width < 20) continue;
    var tLeft = Math.round(tr.left - pr.left);
    var tRight = Math.round(pr.right - tr.right);
    if (tLeft < MIN_GAP && tr.width < pr.width * 0.98) {
      issues.push({ check: 'text-left-touch', el: tag(tel), text: txt(tel), gap: tLeft });
    }
    if (tRight < MIN_GAP && tr.width < pr.width * 0.98) {
      issues.push({ check: 'text-right-touch', el: tag(tel), text: txt(tel), gap: tRight });
    }
  }

  return { pass: issues.length === 0, issueCount: issues.length, issues: issues };
})();
