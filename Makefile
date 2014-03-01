%.js:
	node 2.js $(patsubst %.js,%.lua,$@)

.PHONY: test
test: pull_script.js insert_script.js
	./node_modules/.bin/mocha

