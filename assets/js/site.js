// Printing in Residence — small behaviours only.
// Every page works with this file missing: the menu shows as a plain list
// and the copy buttons stay hidden.

(function () {
  "use strict";

  // Menu button for small screens.
  var button = document.querySelector(".menu-button");
  var nav = document.getElementById("site-nav");

  function setMenu(open) {
    if (!button || !nav) return;
    button.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      nav.setAttribute("data-open", "");
    } else {
      nav.removeAttribute("data-open");
    }
  }

  if (button && nav) {
    button.hidden = false;
    button.addEventListener("click", function () {
      setMenu(button.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        button.focus();
      }
    });
  }

  // Copy buttons, for example the Housing email template.
  // <button class="copy-button" data-copy-target="id-of-pre" hidden>Copy</button>
  var copyButtons = document.querySelectorAll("[data-copy-target]");
  Array.prototype.forEach.call(copyButtons, function (copyButton) {
    var target = document.getElementById(copyButton.getAttribute("data-copy-target"));
    if (!target || !navigator.clipboard) return;
    var original = copyButton.textContent;
    copyButton.hidden = false;
    copyButton.addEventListener("click", function () {
      navigator.clipboard.writeText(target.textContent.trim()).then(
        function () {
          copyButton.textContent = "Copied";
          window.setTimeout(function () {
            copyButton.textContent = original;
          }, 2000);
        },
        function () {
          copyButton.textContent = "Copy failed. Select the text instead.";
        }
      );
    });
  });

  // Open every answer before printing so the PDF export shows them.
  window.addEventListener("beforeprint", function () {
    Array.prototype.forEach.call(document.querySelectorAll("details"), function (d) {
      d.open = true;
    });
  });
})();
