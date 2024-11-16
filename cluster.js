const fs = require('fs');
const { Cluster } = require('puppeteer-cluster');

const urls = [
    "https://www.amazon.com/s?i=specialty-aps&srs=21217035011&rh=n%3A21217035011%2Cn%3A2972638011&s=popularity-rank&dc&fs=true&ds=v1%3AoyIC3zZ7HRvQ9E02mNfoC2dafi7HDAD8PhrEbWXQWko&qid=1731786532&rnid=2941120011&ref=sr_nr_n_11",
    "https://www.amazon.com/s?k=engine+and+engine+parts&i=automotive&rh=n%3A24675388011&pf_rd_i=24675388011&pf_rd_m=ATVPDKIKX0DER&pf_rd_p=744cdf00-bd48-42da-86e6-a78d7f1addf4&pf_rd_r=5R1BDDYCBMFREK775VPV&pf_rd_s=merchandised-search-3&pf_rd_t=101&qid=1731786605&rnid=386419011&ref=sr_nr_p_36_0_0&low-price=1300&high-price="
];

(async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 5, // Adjust as needed based on your machine's resources
        monitor: true,
        puppeteerOptions: {
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp",
        },
    });

    cluster.on('taskerror', (err, data) => {
        console.log(`Error crawling %{data}: ${err.message}`)
    })
    // Task with proper destructuring for page and data (URL)
    await cluster.task(async ({ page, data: url }) => {
        await page.goto(url);
        let products = [];
        let isBtnDisabled = false;

        while (!isBtnDisabled) {
            const items = await page.$$('.sg-col-inner');

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

                    fs.appendFileSync('results.csv', `${title.replace(/,/g, ".")},${price},${img}\n`, function (err) {
                        if (err) {
                            throw (err);
                        }
                    });
                }
            }

            await page.waitForSelector('.s-pagination-strip');
            const isDisabled = await page.$('.s-pagination-item.s-pagination-next.s-pagination-disabled') !== null;
            if (isDisabled) {
                console.log('Last page reached!');
                isBtnDisabled = true;
            } else {
                await page.waitForSelector('.s-pagination-next.s-pagination-button', { visible: true });
                await page.click('.s-pagination-next.s-pagination-button');
                console.log("Next page clicked");
            }
        }
    });

    // Queue each URL
    for (const url of urls) {
        await cluster.queue(url);
    }

    await cluster.idle();
    await cluster.close();
})();
