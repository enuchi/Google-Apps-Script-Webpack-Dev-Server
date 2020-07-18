const onSocketMsg = {
  hot() {
    hot = true;
    iframe.attr('src', contentPage + window.location.hash);
  },
  invalid() {
    okness.text('');
    status.text('App updated. Recompiling...');
    header.css({
      borderColor: '#96b5b4',
    });
    $errors.hide();
    if (!hot) {
      iframe.hide();
    }
  },
  hash(hash) {
    currentHash = hash;
  },
  'still-ok': function stillOk() {
    okness.text('');
    status.text('App ready.');
    header.css({
      borderColor: '',
    });
    $errors.hide();
    if (!hot) {
      iframe.show();
    }
  },
  ok() {
    okness.text('');
    $errors.hide();
    reloadApp();
  },
  warnings() {
    okness.text('Warnings while compiling.');
    $errors.hide();
    reloadApp();
  },
  errors: function msgErrors(errors) {
    status.text('App updated with errors. No reload!');
    okness.text('Errors while compiling.');
    $errors.text(`\n${stripAnsi(errors.join('\n\n\n'))}\n\n`);
    header.css({
      borderColor: '#ebcb8b',
    });
    $errors.show();
    iframe.hide();
  },
  close() {
    status.text('');
    okness.text('Disconnected.');
    $errors.text(
      '\n\n\n  Lost connection to webpack-dev-server.\n  Please restart the server to reestablish connection...\n\n\n\n'
    );
    header.css({
      borderColor: '#ebcb8b',
    });
    $errors.show();
    iframe.hide();
  },
};
