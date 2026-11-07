			parent: i ? neck[i - 1] : "body",
			at: j.neck[i]
		})),
		{
			name: "head",
			parent: neck[neck.length - 1],
			at: j.head
		},
		{
			name: "tail",
			parent: "body",
			at: j.tail
		},
