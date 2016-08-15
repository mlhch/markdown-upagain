
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
    var domTree = new DOMParser().parseFromString(rawHtml, 'text/html');
    cleanHtml   = domTree.body.innerHTML
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
