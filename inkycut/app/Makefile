remotion-bundle:
	rm -rf /tmp/remotion-bundle
	node src/vibe-video-cut/scripts/bundle.mjs

render-local: remotion-bundle
	REMOTION_BUNDLE_URI=http://localhost:3000/remotion-bundle/ npx tsx src/vibe-video-cut/scripts/render.ts --data $(file)

render:
	REMOTION_BUNDLE_URI=https://inkycut.com/remotion-bundle/ npx tsx src/vibe-video-cut/scripts/render.ts --data $(file)

deploy:
	REACT_APP_API_URL=https://api.inkycut.com \
	WASP_SERVER_URL=https://api.inkycut.com \
	WASP_WEB_CLIENT_URL=https://inkycut.com \
	wasp deploy fly deploy

