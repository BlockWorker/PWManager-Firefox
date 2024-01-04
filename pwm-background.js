function buttonClick() {
  browser.tabs.create({
    url: "genpage/genpage.html"
  });
}

function onCommand(name) {
  browser.tabs.query({
    currentWindow: true,
    active: true
  }).then(tabs => {
    for (const tab of tabs) {
      browser.tabs.sendMessage(tab.id, name);
    }
  });
}

browser.browserAction.onClicked.addListener(buttonClick);
browser.commands.onCommand.addListener(onCommand);