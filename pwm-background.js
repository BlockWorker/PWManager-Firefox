
browser.action.onClicked.addListener(() => {
  browser.tabs.create({
    url: "genpage/genpage.html"
  });
});

browser.commands.onCommand.addListener(async (name) => {
  const tabs = await browser.tabs.query({
    currentWindow: true,
    active: true
  });
  for (const tab of tabs) {
    browser.tabs.sendMessage(tab.id, name);
  }
});
