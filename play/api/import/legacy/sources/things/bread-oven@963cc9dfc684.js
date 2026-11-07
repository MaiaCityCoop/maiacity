//#piece 4a2c5f04d87b1cc9eff9f9749f90ec123241d63a725adfbbb98a2eda0685551c
//#piece 1022d716130cfd106bb9a3543b199b757f08123b38e08d9ec859214b850d4d45
	g.position.set(x, 0, z);
	g.rotation.y = rot;
//#piece 7af2a797dae63dd5e9bbec36f9538680a83449547dc086987fe8e0d582d0d77e
//#piece e77063df016343b1a657a5d597c1e19b068881b7bc0f3f4ded85f59325abbee4
	id: "bread-oven",
	label: "Bread oven",
	note: "a clay dome on a stone plinth, firewood under its lip: for the bakery inside and the pizza square outside",
	usedIn: "Dome rooms",
	make: () => centred(oven(kitOf(), 0, 0))
//#piece efdcca1a04fdda7a2276303e92b595b83cca8a110f3d7dda62713404df030b61
