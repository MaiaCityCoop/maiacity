		}
		const husk = x.createRadialGradient(cx, cy, 20, cx, cy, 62);
		husk.addColorStop(0, "#f1ead2");
		husk.addColorStop(1, "#9db45a");
		x.fillStyle = husk;
		x.beginPath();
		x.ellipse(cx, cy, 60, 52, 0, 0, Math.PI * 2);
		x.fill();
		const nut = (nx, ny, a) => {
			x.save();
			x.translate(nx, ny);
			x.rotate(a);
			const g = x.createRadialGradient(-10, -10, 3, 0, 0, 34);
			g.addColorStop(0, "#b0602c");
			g.addColorStop(1, "#4a2210");
			x.fillStyle = g;
			x.beginPath();
			x.moveTo(0, -32);
			x.quadraticCurveTo(30, -22, 28, 10);
			x.quadraticCurveTo(24, 30, 0, 30);
			x.quadraticCurveTo(-24, 30, -28, 10);
			x.quadraticCurveTo(-30, -22, 0, -32);
			x.fill();
			x.fillStyle = "#d9c9a0";
			x.beginPath();
			x.ellipse(0, 24, 20, 7, 0, 0, Math.PI * 2);
			x.fill();
			x.fillStyle = "rgba(255,255,255,0.45)";
			x.beginPath();
			x.ellipse(-10, -12, 6, 12, .4, 0, Math.PI * 2);
			x.fill();
			x.restore();
		};
		nut(82, 126, -.25);
		nut(128, 128, .25);
	}
};
