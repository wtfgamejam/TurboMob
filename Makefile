.DEFAULT_GOAL := run
nvm:
	export NVM_DIR=~/.nvm
	. /usr/local/opt/nvm/nvm.sh; \
	nvm use stable

install: nvm ## Run the app locally
	npm install

run: nvm ## Run the app locally
	nodemon app.js
