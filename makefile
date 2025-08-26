.PHONY: test mammoth.browser.js npm-install

test:
	npm test

setup: npm-install mammoth.browser.min.js

npm-install:
	npm install

mammoth.browser.js:
	node_modules/.bin/browserify lib/index.js --standalone mammoth -p browserify-prepend-licenses --ignore-missing > $@

mammoth.browser.min.js: mammoth.browser.js
	node_modules/.bin/uglifyjs mammoth.browser.js -c > $@
