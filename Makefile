# FractaPay monorepo helpers

# Node projects (contains package.json). shared first — web/server import it as fractapay-shared.
NODE_PROJECTS := . shared server web

.PHONY: clean install reinstall

# Delete every node_modules in the monorepo
clean:
	@echo "Removing all node_modules…"
	@find . -name node_modules -type d -prune -exec rm -rf '{}' +
	@echo "Done."

# Run npm install in every node project
install:
	@for project in $(NODE_PROJECTS); do \
		echo "npm install → $$project"; \
		( cd $$project && npm install ) || exit 1; \
	done
	@echo "Done."

# Wipe then reinstall everything
reinstall: clean install
