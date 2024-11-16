const fs = require('fs')
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: false,
        userDataDir: "./tmp",
    });
    const page = await browser.newPage();

    // Navigate to the Amazon search results URL
    await page.goto('https://www.amazon.com/s?k=hurling+stick&crid=2F880SF7HV7AJ&qid=1731511123&sprefix=hurling+stick%2Caps%2C150');

    let products = [];
    let isBtnDisabled = false;

    while (!isBtnDisabled) {
        const items = await page.$$('.sg-col-inner');
        //await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

        for (const item of items) {
            let title = "Null";
            let price = "Null";
            let img = "Null";

            try {
                title = await item.$eval('h2 > a > span', el => el.textContent);
            } catch (error) { }

            try {
                price = await item.$eval('.a-price > .a-offscreen', el => el.textContent);
            } catch (error) { }

            try {
                img = await item.$eval('.a-section > img', el => el.getAttribute('src'));
            } catch (error) { }

            if (title !== "Null") {
                products.push({ title, price, img });

                fs.appendFile('results.csv', `${title.replace(/,/g, ".")},${price},${img}\n`, function (err) {
                    if (err) {
                        throw (err)
                    }
                })
            }
        }
        await page.waitForSelector('.s-pagination-strip')
        const isDisabled = await page.$('.s-pagination-item.s-pagination-next.s-pagination-disabled') !== null;
        if (isDisabled) {
            console.log('last page reached!')
            isBtnDisabled = true;
        }
        else {
            await page.waitForSelector('.s-pagination-next.s-pagination-button', { visible: true });

            isBtnDisabled = isDisabled;

            page.click('.s-pagination-next.s-pagination-button')
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),

                console.log("NEXT PAGE CLICKED");
            //console.log(products.length);

        }
    }

    await browser.close();  // Moved inside the async function's scope.
})();   
