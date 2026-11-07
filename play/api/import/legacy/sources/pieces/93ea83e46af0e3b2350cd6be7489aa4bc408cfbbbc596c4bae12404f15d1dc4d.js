//#piece 10be253320949b7a42ae06618a28f35677c89220b3cd3505cc0edff4e2bebc92
		p: pts[k].clone().lerp(pts[k + 1], f - k),
		d: pts[k + 1].clone().sub(pts[k]).normalize()
