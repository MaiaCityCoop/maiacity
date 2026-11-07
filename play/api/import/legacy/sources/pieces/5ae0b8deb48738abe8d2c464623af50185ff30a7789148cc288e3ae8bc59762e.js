		for (const b of buckles) b.visible = k < .08;
		handle.visible = lay < .02;
		for (const [name, [from, to]] of Object.entries(places)) parts[name].position.lerpVectors(from, to, ease(clamp((k - .3) / .7)));
	}
	g.userData = {
		open,
		setOpen,
		parts
	};
	setOpen(open);
//#piece c729b38b253f1abf985872fc0f824e9e23f518a8cc3f50841183a2676ff24549
