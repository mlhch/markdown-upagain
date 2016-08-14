
function diff(leftText, rightText, leftName, rightName) {
  var left    = difflib.stringAsLines(leftText);
  var right   = difflib.stringAsLines(rightText);
  var result  = new difflib.SequenceMatcher(left, right);

  return diffview.buildView({
    baseTextLines: left,
    newTextLines : right,
    opcodes      : result.get_opcodes(),
    baseTextName : leftName,
    newTextName  : rightName,
    contextSize  : null,
    viewType     : 0 // 0 左右对比，1 行内对比
  });
}

function diffWords(leftText, rightText) {
  var diff = JsDiff.diffWords(leftText, rightText);
  var fragment = document.createDocumentFragment();
  var node;

  for (var i = 0; i < diff.length; i++) {
    if (diff[i].removed) {
      node = document.createElement('del');
      node.appendChild(document.createTextNode(diff[i].value));
    } else if (diff[i].added) {
      node = document.createElement('ins');
      node.appendChild(document.createTextNode(diff[i].value));
    } else {
      node = document.createTextNode(diff[i].value);
    }
    fragment.appendChild(node);
  }

  return fragment;
}

jQuery.fn.autoHeight = function autoHeightTextarea() {
  this.css('height', 'auto').css('height', this[0].scrollHeight + 10 + 'px');
}

document.addEventListener("DOMContentLoaded", function(event) {
  var rawHtml, cleanHtml;

  var showdownConverter = new showdown.Converter({
    noHeaderId: true,
    literalMidWordUnderscores: false
  });

  $.get('test.html', function(testHtml) {
    $('#raw-html').val(testHtml).autoHeight();
    preprocess() && convert();
  });

  window.convert = function() {
    var strMarkdown = toMarkdown(cleanHtml);
    $('#converted-markdown').val(strMarkdown).autoHeight();
    $('#html-vs-markdown').html('').append(diffWords(cleanHtml, strMarkdown));

    var strHtmlAgain = showdownConverter.makeHtml(strMarkdown);
    $('#orig-html-rendered').html(cleanHtml);
    $('#again-html-rendered').html(strHtmlAgain);
    if (cleanHtml == strHtmlAgain) {
      $('#match-message').html('Congratulations! All lines match exactly the same. Your html is safe and stable.');
    } else {
      $('#match-message').html('Oops? Please check the mismatched lines to see what\'s wrong.');
    }

    $('#html-vs-upagain').html('').append(
      diff(cleanHtml, strHtmlAgain, "Cleaned HTML", "Up-again HTML")
    );
  }

  window.preprocess = function () {
    rawHtml     = $('#raw-html').val();
    $('#raw-html').autoHeight();
    /// 至少可以去除 body 以外（含 body）标签
    var domTree = new DOMParser().parseFromString(rawHtml, 'text/html');
    var allowedTags   = /^(body|script|div|p|h[1-6]|a|img|blockquote|ul|ol|li|pre|code|hr|em|strong|br|span|b|i)$/i
    var passbyTags    = /^(div|span)$/i
    var newLineTags   = /^()$/i
    var blockTags     = /^(p|h[1-6]|script|blockquote|ul|li|ol|pre|hr)$/i
    var selfCloseTags = /^(img|br|hr)$/i
    var contentTags   = /^(p|h[1-6]|a|span|em|strong|pre|li|code|b|i)$/i

    function parseNode(node) {
      var row, rows = [], tag, childRows;
      var str, re;
      if (node.tagName.match(contentTags)) {
        rows = node.innerHTML.split(/<([a-z]+)[^>]*>[\s\S]*?<\/\1>|<(hr|br|img)(?:[^>]*)(?: | \/)?>/);
      }
      for (var i = 0, child; child = node.children[i++];) {
        tag = child.tagName.toLowerCase();
        if (!tag.match(allowedTags)) continue;

        row = [];
        if (!tag.match(passbyTags)) {
          row.push('<' + tag);
          /// 2016-08-14 20:22 Sunday
          /// - 很奇怪，child.src, child.href 等直接取值为空，用 getAttribute 就行得通
          child.id && row.push(' id="' + child.id + '"');
          child.className && row.push(' class="' + child.className + '"');
          child.getAttribute('alt') && row.push(' alt="' + child.getAttribute('alt') + '"');
          child.getAttribute('src') && row.push(' src="' + child.getAttribute('src') + '"');
          if (str = child.getAttribute('href')) {
            row.push(' href="' + str.replace(/&/g, '&amp;') + '"');
          }
          child.title && row.push(' title="' + child.title + '"');
          row.push('>');
        }

        if (tag.match(contentTags)) {
          if (child.children.length) {
            row.push(parseNode(child).join(''));
          } else {
            row.push(child.innerHTML);
          }
          tag.match(newLineTags) && row.push('\n');
        } else if (!tag.match(selfCloseTags)) {
          childRows = parseNode(child)
          if (childRows.length) {
            if (tag == 'blockquote' || tag == 'ul' || tag == 'ol') {
              row.push('\n');
              row.push(childRows.join('\n\n'));
              row.push('\n');
            } else {
              rows = rows.concat(childRows);
            }
          }
        }

        if (!tag.match(passbyTags) && !tag.match(selfCloseTags)) {
          row.push('</' + tag + '>');
        }

        if (node.tagName.match(contentTags)) {
          rows.splice(i * 3 - 2, 2, row.join(''), '');
        } else {
          row.length && rows.push(row.join(''));
        }
      }

      return rows;
    }

    cleanHtml = parseNode(domTree.body).join('\n\n');
    // $('#html-vs-upagain').html('').append(
    //   diff(rawHtml, cleanHtml, "Cleaned HTML", "Up-again HTML")
    // );
    // return console.log(cleanHtml.join('\n\n'));
    /// 去行首空白
    // cleanHtml = cleanHtml.replace(/(^|\n)[^\S\n]+/g, '\n');
    // /// 去注释
    // cleanHtml = cleanHtml.replace(/<!--[\s\S]*?-->/g, '\n');
    // /// 2016-08-14 10:05 Sunday
    // /// - JavaScript 正则还不能处理嵌套，所以用分别删除 <div...> 和 </div> 的办法
    // cleanHtml = cleanHtml.replace(/<(div|textarea)\s?[^>]*>|<\/(div|textarea)>/g, '');
    // /// 去空 p
    // cleanHtml = cleanHtml.replace(/<p\s?[^>]*>\s*<\/p>/g, '');
    // /// 去多行空白
    // cleanHtml = cleanHtml.replace(/\n\n+/g, '\n\n');
    // /// 去头尾空白
    // cleanHtml = cleanHtml.replace(/^\s+/, '').replace(/\s+$/, '');
    // cleanHtml = cleanHtml.replace(/<h1>\s+/g, '<h1>');
    // cleanHtml = cleanHtml.replace(/\s+<\/h1>/g, '</h1>');
    $('#clean-html').html('').append(diffWords(rawHtml, cleanHtml));

    $('#converted-markdown').val('').autoHeight();
    $('#html-vs-markdown').html('');

    $('#match-message').html('');
    $('#html-vs-upagain').html('');
    $('#orig-html-rendered').html('');
    $('#again-html-rendered').html('');

    return true;
  }
});
