			...p.chain ? { chain: {
				...p.chain,
				soft: (p.chain.soft ?? .05) * s,
				...p.chain.tip ? { tip: m(p.chain.tip) } : {}
			} } : {}
		}))
	};
}
