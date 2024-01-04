const table = document.getElementById("table");
const addBtn = document.getElementById("add");
const saveBtn = document.getElementById("save");

var rows = new Set();

function deleteRow(row) {
  row.remove();
  rows.delete(row);
}

function createRow(ident, iter, symbols) {
  const newRow = document.createElement("tr");
  const identCell = document.createElement("td");
  const iterCell = document.createElement("td");
  const symbolCell = document.createElement("td");
  const buttonCell = document.createElement("td");
  const identBox = document.createElement("input");
  const iterBox = document.createElement("input");
  const symbolBox = document.createElement("input");
  const button = document.createElement("button");
  
  buttonCell.style.width = "50px";
  
  identBox.type = "text";
  iterBox.type = "number";
  symbolBox.type = "text";
  button.type = "button";
  
  identBox.value = ident;
  iterBox.value = iter;
  iterBox.min = 0;
  symbolBox.value = symbols;
  button.innerText = "-";
  
  button.addEventListener("click", function() {
    deleteRow(newRow);
  });
  
  identCell.appendChild(identBox);
  iterCell.appendChild(iterBox);
  symbolCell.appendChild(symbolBox);
  buttonCell.appendChild(button);
  
  newRow.appendChild(identCell);
  newRow.appendChild(iterCell);
  newRow.appendChild(symbolCell);
  newRow.appendChild(buttonCell);
  
  rows.add(newRow);
  table.appendChild(newRow);
}

function saveData() {
  browser.storage.sync.clear();
  rows.forEach(row => {
    const ident = row.children[0].children[0].value;
    const iter = row.children[1].children[0].value;
    const symbols = row.children[2].children[0].value;
    browser.storage.sync.set({[ident]: [iter, symbols]});
  });
}

function init() {
  document.getElementById("identheader").innerText = browser.i18n.getMessage("ident");
  document.getElementById("iterheader").innerText = browser.i18n.getMessage("iter");
  document.getElementById("symbolheader").innerText = browser.i18n.getMessage("symbols");
  saveBtn.innerText = browser.i18n.getMessage("save");
  
  browser.storage.sync.get().then(items => {
    if (items != undefined) {
      for (const ident in items) {
        const iter = items[ident][0];
        const symbols = items[ident][1];
        createRow(ident, iter, symbols);
      }
    }
  });
}

addBtn.addEventListener("click", function() {
  createRow("", 0, defaultSymbols);
});

saveBtn.addEventListener("click", saveData);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
