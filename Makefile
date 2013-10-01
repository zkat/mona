project-name = mona
#
# Binaries
#
module-root = ./node_modules
uglify = $(module-root)/uglify-js/bin/uglifyjs
browserify = $(module-root)/browserify/bin/cmd.js
jsdoc = $(module-root)/jsdoc/jsdoc
mocha = $(module-root)/mocha/bin/mocha $(mocha-opts)
linter = $(module-root)/jshint/bin/jshint $(linter-opts)
semver = $(module-root)/semver/bin/semver

#
# Opts
#
mocha-opts = --check-leaks
linter-opts =
jsdoc-opts = -t $(module-root)/ink-docstrap/template

#
# Files
#
main-file = src/mona.js
source-files = src/*.js
build-dir = build
docs-dir = docs
examples-dir = examples
browserify-bundle = $(build-dir)/mona.js
min-file = $(build-dir)/mona.min.js
source-map-filename = mona.js.src
source-map = $(build-dir)/$(source-map-filename)
jsdoc-config = jsdoc.conf.json
linter-config = jshint.conf.json
readme = README.md
test-files = $(shell find src/ -type f -iname "*test.js") \
             $(shell find examples/ -type f -iname "*test.js")

#
# Targets
#
.PHONY: all
all: lint test-quiet docs compile

.PHONY: compile
compile: $(min-file) $(source-map)

.PHONY: release-%
release-%: all
	npm version $* -m "Upgrading mona to %s" ;
	git checkout master ; \
	git merge develop --ff-only ; \
	git checkout develop

.PHONY: publish
publish:
	git push
	git push --tags
	npm publish .

$(min-file) $(source-map): $(browserify-bundle)
	$(uglify) $(browserify-bundle) \
        --compress \
		--output $(min-file) \
		--source-map $(source-map) \
        --source-map-url $(source-map-filename)

$(browserify-bundle): $(main-file) $(source-files) | $(build-dir)
	$(browserify) $(main-file) \
		-s mona \
		-o $@

$(build-dir):
	mkdir -p $@

$(docs-dir): $(jsdoc-config) $(source-files) $(readme)
	$(jsdoc) -d $@ $(jsdoc-opts) -c $(jsdoc-config) $(source-files) $(readme)

.PHONY: clean
clean:
	-rm -rf $(build-dir)
	-rm -rf $(docs-dir)

.PHONY: test
test: test-spec

.PHONY: test-spec
test-spec: $(source-files) $(test-files)
	$(mocha) --reporter spec $(test-files)

.PHONY: test-quiet
test-quiet: $(source-files) $(test-files)
	$(mocha) --reporter dot $(test-files)

.PHONY: test-watch
test-watch: $(source-files) $(test-files)
	$(mocha) --reporter min --watch $(test-files)

.PHONY: lint
lint: $(source-files) $(linter-config)
	$(linter) --config $(linter-config) $(source-files)

.PHONY: example-%
example-%: $(examples-dir)/*.js $(browserify-bundle)
	node examples/$*.js
