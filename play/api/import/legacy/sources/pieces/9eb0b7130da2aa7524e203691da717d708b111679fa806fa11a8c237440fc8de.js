		} else {
			const give = .025 * pace * Math.sin(TAU * 2 * ph);
			pose[neck[neck.length - 1]] = [
				give,
				turn * .2,
				0
			];
			pose.head = [
				-give,
				turn * .15,
				0
			];
