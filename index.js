
var fs = require('fs');

var toMarkdown = require('./to-markdown.js');
var showdown   = require('./showdown.js');
var md2html    = new showdown.Converter({noHeaderId: true});

toMarkdownOptions = {
	gfm: true,
	converters: [{
		filter: 'pre',
		replacement: function(content, node) {
			if (node.firstChild && node.firstChild.nodeName === 'CODE') {
				return '\n\n```\n' + node.firstChild.textContent.replace(/\n+$/, '') + '\n```\n\n';
			}
			return '    ' + content.replace(/\n/g, '\n    ') + '\n\n';
		}
	}, {
		filter: 'br',
		replacement: function(content, node) {
			return '\n';
		}
	}, {
		// Inline code
		filter: function (node) {
			var hasSiblings = node.previousSibling || node.nextSibling;
			var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings;

			return node.nodeName === 'CODE' && !isCodeBlock;
		},
		replacement: function(content, node) {
			/// 2016-07-31 08:48 Sunday
			/// - <code>`</code> 应该加上空格变成 `` ` ``，否则成为 ``` 就迷失了
			if (content === '`') {
				return '`` ' + content + ' ``';
			}
			return '`' + content + '`';
		}
	}]
};

var input = fs.readFile('/Users/mlhch/Desktop/aaaa', 'utf-8', function(error, data) {
	if (error) {
		return console.log(error);
	}

	var md = toMarkdown(data, toMarkdownOptions);

	var html = md2html.makeHtml(md);

	var md2 = toMarkdown(html, toMarkdownOptions)

	fs.writeFile('/Users/mlhch/Desktop/aaa', md, function(error) {
		if (error) {
			return console.log(error);
		}
		console.log('aaa saved');
	});

	fs.writeFile('/Users/mlhch/Desktop/bbb', md2, function(error) {
		if (error) {
			return console.log(error);
		}
		console.log('bbb saved');
	});

	fs.writeFile('/Users/mlhch/Desktop/bbbb', html, function(error) {
		if (error) {
			return console.log(error);
		}
		console.log('bbbb saved');
	});
});
