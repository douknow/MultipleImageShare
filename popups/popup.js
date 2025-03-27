console.log("popup.html loaded");

let updateStatus = (text) => {
  document.getElementById("status-text").innerText = text;
};

document.addEventListener("DOMContentLoaded", () => {
  updateStatus("Downloading note images...");
  downloadNoteImages();
});

document.getElementById("copy-image-button").addEventListener("click", async () => {
  await copyImageToPasteboard();
  updateStatus("Copied to pasteboard");
});

let copyImageToPasteboard = async () => {
  const imageUrl = document.getElementById("share-result-img").src;
  let blob = await fetch(imageUrl).then((res) => res.blob());
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
};

let downloadNoteImages = async () => {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    async function (tabs) {
      try {
        // 执行脚本并获取结果
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: async () => {
            // 在目标页面执行的代码
            const images = document.querySelectorAll(
              ".swiper-wrapper img.note-slider-img"
            );
            // 返回图片的blob
            const imageBlobs = await Promise.all(
              Array.from(images).map((img) =>
                fetch(img.src).then((res) => res.blob())
              )
            );

            let waitForImageToLoad = (imgUrl) => {
              console.log(imgUrl);
              return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (e) =>
                  reject(new Error(`加载图片失败: ${imgUrl}`));
                img.src = imgUrl;
              });
            };

            let imageObjs = [];
            for (const imageBlob of imageBlobs) {
              let imageObj = await waitForImageToLoad(
                URL.createObjectURL(imageBlob)
              );
              imageObjs.push(imageObj);
            }

            let fullW = 1080;
            let fullH = imageObjs.reduce((acc, img) => {
              let scaledH = img.height * (fullW / img.width);
              return acc + scaledH;
            }, 0);

            console.log(fullH);

            // pin to long image
            const canvas = document.createElement("canvas");
            canvas.width = fullW; // 设置画布宽度
            canvas.height = fullH; // 设置画布高度
            const ctx = canvas.getContext("2d");

            imageObjs.forEach((img, index) => {
              let scaledH = img.height * (fullW / img.width);
              ctx.drawImage(img, 0, index * scaledH);
            });

            let url = canvas.toDataURL("image/png");
            return url;
          },
        });

        // 处理返回值
        if (results && results[0] && results[0].result) {
          const imageBlobs = results[0].result;
          document.getElementById("share-result-img").src = imageBlobs;
          updateStatus("Ready to share");
          document.getElementById("copy-image-button").style.display = "block";
          document.getElementById("share-result").style.display = "block";
        } else {
          console.log("没有找到图片");
        }
      } catch (err) {
        console.error("执行脚本时出错:", err);
      }
    }
  );
};

let downloadImages = async (imageBlobs) => {
  const images = await Promise.all(
    imageBlobs.map((blob) => URL.createObjectURL(blob))
  );
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 1000; // 设置画布宽度
  canvas.height = 1000; // 设置画布高度

  let offset = 0;
  for (const image of images) {
    const img = new Image();
    img.src = image;
    ctx.drawImage(img, offset, 0);
    offset += 100; // 设置图片之间的间距
  }

  return canvas.toDataURL("image/png");
};
