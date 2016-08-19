var cleanHtml;


function getShowdownOptions() {
  return {
    noHeaderId   : true,
    literalMidWordUnderscores: false,
    preopen      : $('[name=preopen]:checked').val(),
    preclose     : $('[name=preclose]:checked').val(),
    precodeopen  : $('[name=precodeopen]:checked').val(),
    precodeclose : $('[name=precodeclose]:checked').val(),
    closetag     : $('[name=closetag]:checked').val(),
    nbsp         : $('[name=nbsp]:checked').val(),
    ltgt         : $('[name=ltgt]:checked').val(),
    ampersand    : $('[name=ampersand]:checked').val(),
    entity       : $('[name=entity]:checked').val(),
    quotes       : $('[name=quotes]:checked').val()
  }
}


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


function parseHTMLEntities(charref) {
  var entities = {}
  var entity, trs = charref.match(/<tr\b[\s\S]*?(?=<tr)/g);
  if (trs) {
    trs.forEach(function (tr) {
      /**
       * /<td class="named"><code> 匹配 named 字段
       * ([^ <]+)                  第一个非空格有效串
       * (?: [^<]+)*               一个实体可能对应了几个名字，用空格隔开
       * <\/code>
       * .*?                       略过一些不想提取的字段
       * <td class="dec"><code>    匹配 dec 字段
       * &amp;#(\d+);              只取得想要的数字
       * <\/code>
       * .*?<td class="desc">(.*?)
       * (\n|$)/
       */
      var m = tr.match(/<td class="named"><code>([^ <]+)(?: [^<]+)*<\/code>.*?<td class="dec"><code>&amp;#(\d+);<\/code>.*?<td class="desc">(.*?)(\n|$)/);
      if (m) {
        entities[parseInt(m[2])] = {desc: m[3], named: m[1].replace('&amp;', '&')};
      }
    });
  }
  window.HTMLEntities = entities;
}


function parseHtmlFeatures(rawHtml) {
  $('#raw-html').val(rawHtml).autoHeight();

  if (rawHtml.match(/<pre>\n/)) {
    $('[name=preopen][value=newline]').prop('checked', true);
  } else {
    $('[name=preopen][value=sameline]').prop('checked', true);
  }

  if (rawHtml.match(/\n<\/pre>/)) {
    $('[name=preclose][value=newline]').prop('checked', true);
  } else {
    $('[name=preclose][value=sameline]').prop('checked', true);
  }

  if (rawHtml.match(/<pre><code>\n/)) {
    $('[name=precodeopen][value=newline]').prop('checked', true);
  } else {
    $('[name=precodeopen][value=sameline]').prop('checked', true);
  }

  if (rawHtml.match(/\n<\/code><\/pre>/)) {
    $('[name=precodeclose][value=newline]').prop('checked', true);
  } else {
    $('[name=precodeclose][value=sameline]').prop('checked', true);
  }

  var html5closetag = rawHtml.match(/<br>|<hr>|<img\b[^>]*(?!\/).>/g);
  var xhtmlclosetag = rawHtml.match(/<br(?:\/| \/)>|<hr(?:\/| \/)>|<img\b[^>]*(?:\/| \/)>/g);
  if (html5closetag) {
    $('[name=closetag][value=html5]').prop('checked', true);
  } else {
    $('[name=closetag][value=xhtml]').prop('checked', true);
  }
  $('[name=closetag]').closest('li').find('span').html('('
    + (html5closetag ? html5closetag.length : 0) + ' &lt;br&gt;|&lt;hr&gt;|&lt;img*&gt;'
    + ' and '
    + (xhtmlclosetag ? xhtmlclosetag.length : 0) + ' &lt;br ?/&gt;|&lt;hr ?/&gt;|&lt;img* ?/&gt;'
    + ' found)'
  );

  // 如果 < > 出现在非标签中
  var ltgt_char = rawHtml.replace(/<([a-z]+|h[1-6]\b)([^>]*)>/g, function (m, m1, m2) {
    return '((' + m1 + m2 + '))';
  }).replace(/<\/([a-z]+|h[1-6])>/g, function (m, m1) {
    return '((/' + m1 + '))';
  }).match(/[<>]/);
  if (ltgt_char) {
    $('[name=ltgt][value=needed]').prop('checked', true);
  } else {
    $('[name=ltgt][value=always]').prop('checked', true);
  }
  var ltgt_entity = rawHtml.match(/&lt;|&gt;/g);
  $('[name=ltgt]').closest('li').find('span').html('('
    + (ltgt_char ? ltgt_char.length : 0) + ' < or > and '
    + (ltgt_entity ? ltgt_entity.length : 0) + ' &amp;lt; or &amp;gt;'
    + ' found)'
  );

  // 如果 & 不在 HTML 实体中出现
  var singleAmp = rawHtml.match(/&(?!([a-z]{2,};|#\d{2,};))/g)
  if (singleAmp) {
    $('[name=ampersand][value=needed]').prop('checked', true);
  } else {
    $('[name=ampersand][value=always]').prop('checked', true);
  }
  $('[name=ampersand]').closest('li').find('span').html(
    '(' + (singleAmp ? singleAmp.length : 0) + ' dangling "&" found)'
  );

  var quotes = rawHtml.match(/&apos;|&#39;|&quot;|&#34;/g);
  if (quotes) {
    $('[name=quotes][value=always]').prop('checked', true);
  } else {
    $('[name=quotes][value=needed]').prop('checked', true);
  }
  $('[name=quotes]').closest('li').find('span').html(
    '(' + (quotes ? quotes.length : 0) + ' [&amp;apos;/&amp;#39;] or [&amp;quot;/&amp;#34;] found)'
  );

  /**
   * 2016-08-19 10:36 Friday
   * - 这个正则太屌了，完美解决问题
   */
  var normalEntities = rawHtml.match(/&#\d+;|&(?!lt;|gt;|amp;|nbsp;|apos;|quot;)[a-z]{2,};/g);
  var entityChars = rawHtml.match(/[\u00a1-\u9999]/g);
  if (entityChars) {
    entityChars = entityChars.filter(function (c) {
      return HTMLEntities[c.charCodeAt(0)];
    });
  }
  if (normalEntities) {
    $('[name=entity][value=entities]').prop('checked', true);
  } else {
    $('[name=entity][value=utf8char]').prop('checked', true);
  }
  $('[name=entity]').closest('li').find('span').html(
    '(' + (normalEntities ? normalEntities.length : 0) + ' entities and '
    + (entityChars ? entityChars.length : 0) + ' utf8 chars found)'
  );

  var nbspchar = rawHtml.match(new RegExp(String.fromCharCode(160), 'g'));
  var nbspentity = rawHtml.match(/&nbsp;/g);
  if (nbspchar) {
    $('[name=nbsp][value=character]').prop('checked', true);
  } else {
    $('[name=nbsp][value=entity]').prop('checked', true);
  }
  $('[name=nbsp]').closest('li').find('span').html(
    '(' + (nbspchar ? nbspchar.length : 0) + ' "' + String.fromCharCode(160)
    + '" and ' + (nbspentity ? nbspentity.length : 0) + ' "&amp;nbsp;" found)');
}


function domTreeToHtml(node, options) {
  var allowedTags   = /^(body|script|div|p|h[1-6]|a|img|blockquote|ul|ol|li|pre|code|hr|em|strong|br|span|b|i)$/i
  var passbyTags    = /^(div|span|table|thead|tbody|tr|th|td)$/i
  var newLineTags   = /^()$/i
  var blockTags     = /^(p|h[1-6]|script|blockquote|ul|li|ol|pre|hr)$/i
  var selfCloseTags = /^(img|br|hr)$/i
  var contentTags   = /^(p|h[1-6]|a|span|em|strong|pre|li|code|b|i)$/i

  var row, rows = [], tag, childRows;
  var str, re;
  if (node.tagName.match(contentTags)) {
    rows = node.innerHTML.split(/<([a-z]+)[^>]*>[\s\S]*?<\/\1>|<(hr|br|img)(?:[^>]*)(?: | \/)?>/);
    for (var i = 0; i < rows.length; i++) {
      var innerHTML = rows[i];
      if (!innerHTML) continue;
      if (options.nbsp == 'character') {
        innerHTML = innerHTML.replace(/&nbsp;/g, String.fromCharCode(160));
      }
      if (options.nbsp == 'entity') {
        innerHTML = innerHTML.replace(/\u00a0/g, '&nbsp;');
      }
      if (options.entity == 'entities') {
        innerHTML = innerHTML.replace(/\u0022|\u0027|[\u00a1-\u9999]/g, function(m) {
          var entity = HTMLEntities[m.charCodeAt(0)];
          return entity && entity.named || m;
        });
      }
      if (options.quotes == 'always') {
        innerHTML = innerHTML.replace(/\u0027/g, '&apos;').replace(/\u0022/g, '&quot;');
      } else {
        innerHTML = innerHTML.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
      }
      rows[i] = innerHTML;
    }
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
        if (options.ampersand == 'always') {
          row.push(' href="' + str.replace(/&/g, '&amp;') + '"');
        } else {
          row.push(' href="' + str + '"');
        }
      }
      child.getAttribute('title') && row.push(' title="' + child.getAttribute('title') + '"');
      if (tag.match(selfCloseTags) && options.closetag == 'xhtml') {
        row.push(' />');
      } else {
        row.push('>');
      }

      if (tag == 'pre') {
        if (node.children[0] && node.children[0].tagName == 'CODE') {
          if (options.precodeopen == 'newline') {
            row.push('\n');
          }
        } else {
          if (options.preopen == 'newline') {
            row.push('\n');
          }
        }
      }
    }

    if (tag.match(contentTags)) {
      if (child.children.length) {
        row.push(domTreeToHtml(child, options).join(''));
      } else {
        var innerHTML = child.innerHTML;
        if (options.nbsp == 'character') {
          innerHTML = innerHTML.replace(/&nbsp;/g, String.fromCharCode(160));
        }
        if (options.nbsp == 'entity') {
          innerHTML = innerHTML.replace(/\u00a0/g, '&nbsp;');
        }
        if (options.entity == 'entities') {
          innerHTML = innerHTML.replace(/\u0022|\u0027|[\u00a1-\u9999]/g, function(m) {
            var entity = HTMLEntities[m.charCodeAt(0)];
            return entity && entity.named || m;
          });
        }
        if (options.quotes == 'always') {
          innerHTML = innerHTML.replace(/\u0027/g, '&apos;').replace(/\u0022/g, '&quot;');
        } else {
          innerHTML = innerHTML.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
        }
        row.push(innerHTML);
      }
      tag.match(newLineTags) && row.push('\n');
    } else if (!tag.match(selfCloseTags)) {
      childRows = domTreeToHtml(child, options);
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
      if (tag == 'pre') {
        var lastRow = row.pop();
        if (lastRow.match(/<\/code>/)) {
          if (options.precodeclose == 'newline') {
            row.push(lastRow.replace(/\n?<\/code>.*/, '\n</code></pre>'));
          }
          if (options.precodeclose == 'sameline') {
            row.push(lastRow.replace(/\n?<\/code>.*/, '</code></pre>'));
          }
        } else {
          if (options.preclose == 'newline') {
            row.push(lastRow.replace(/\n*$/, '\n</pre>'))
          }
          if (options.preclose == 'sameline') {
            row.push(lastRow.replace(/\n*$/, '</pre>'))
          }
        }
      } else {
        row.push('</' + tag + '>');
      }
    }

    if (node.tagName.match(contentTags)) {
      rows.splice(i * 3 - 2, 2, row.join(''), '');
    } else {
      row.length && rows.push(row.join(''));
    }
  }

  return rows;
}


function preprocess() {
  $('#raw-html').autoHeight();
  var rawHtml   = $('#raw-html').val();
  /// 至少可以去除 body 以外（含 body）标签
  var domTree   = new DOMParser().parseFromString(rawHtml, 'text/html');
  cleanHtml = domTreeToHtml(domTree.body, getShowdownOptions()).join('\n\n');
  if (rawHtml == cleanHtml) {
    $('#cleanMessage').html('<span style="color:green">The raw HTML was clean</span>');
  } else {
    $('#cleanMessage').html('<span style="color:blue">The raw HTML is cleaned</span>');
  }
  // $('#html-vs-upagain').html('').append(
  //   diff(rawHtml, cleanHtml, "Cleaned HTML", "Up-again HTML")
  // );

  $('#clean-html').html('').append(diffWords(rawHtml, cleanHtml));

  $('#converted-markdown').val('').autoHeight();
  $('#html-vs-markdown').html('');

  $('#match-message').html('');
  $('#html-vs-upagain').html('');
  $('#orig-html-rendered').html('');
  $('#again-html-rendered').html('');
}


function convertToMarkdown() {
  var strMarkdown = toMarkdown(cleanHtml);
  $('#converted-markdown').val(strMarkdown).autoHeight();
  $('#html-vs-markdown').html('').append(diffWords(cleanHtml, strMarkdown));

  var showdownConverter = new showdown.Converter(getShowdownOptions());
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


jQuery.fn.autoHeight = function autoHeightTextarea() {
  this.css('height', 'auto').css('height', this[0].scrollHeight + 10 + 'px');
}


document.addEventListener("DOMContentLoaded", function() {
  //var re = /(^|<\/h[1-6]|<i\/[a-z]+>|<(br|hr|img) ?\/?>)(.*?)($|<h[1-6]|<[a-z]+|<br\b|<hr\b|<img\b)/g 
  /**
   * 2016-08-18 23:13 Thursday
   */
  $.when(
    $.get('charref', parseHTMLEntities),
    $.get('test.html')
  )
  .then(function (res1, res2) {
    parseHtmlFeatures(res2[0])
  })
  .then(preprocess)
  .then(convertToMarkdown)
});
