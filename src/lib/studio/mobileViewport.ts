/** Keep the phone workspace above the on-screen keyboard without disabling page zoom. */
export function mobileViewport() {
	const viewport = window.visualViewport;
	const phone = window.matchMedia('(max-width: 740px)');
	const root = document.documentElement;
	function update() {
		if (!phone.matches) {
			root.style.removeProperty('--mobile-viewport-height');
			root.style.removeProperty('--mobile-viewport-top');
			return;
		}
		if (viewport && viewport.scale !== 1) return;
		root.style.setProperty(
			'--mobile-viewport-height',
			`${viewport?.height ?? window.innerHeight}px`
		);
		root.style.setProperty('--mobile-viewport-top', `${viewport?.offsetTop ?? 0}px`);
	}
	update();
	viewport?.addEventListener('resize', update);
	viewport?.addEventListener('scroll', update);
	window.addEventListener('resize', update);
	return () => {
		viewport?.removeEventListener('resize', update);
		viewport?.removeEventListener('scroll', update);
		window.removeEventListener('resize', update);
		root.style.removeProperty('--mobile-viewport-height');
		root.style.removeProperty('--mobile-viewport-top');
	};
}
