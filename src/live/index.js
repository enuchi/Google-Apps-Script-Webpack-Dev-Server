'use strict';
/* eslint import/no-extraneous-dependencies: off */

const $ = require('jquery');
const stripAnsi = require('strip-ansi');

const socket = require('../default/socket');
require('./style.css');

let hot = false;
let currentHash = '';

// store request ids here so we can eliminate any duplicates
const requestIdList = {};

$(() => {
  const body = $('body');
  body.html(require('./page.html'));
  const status = $('#status');
  const okness = $('#okness');
  const $errors = $('#errors');
  const iframe = $('#iframe');
  const header = $('.header');

  const contentPage =
    window.location.pathname.substr('/gas'.length) + window.location.search;

  const receiveMessage = (event) => {
    const allowedRequestDomains = [
      /^https?:\/\/localhost:\d+/,
      /^https?:\/\/127.0.0.\d+/,
    ];

    const allowedResponseDomains = [/^https:\/\/.+.googleusercontent.com$/];

    // 'REQUEST' should come from localhost
    if (
      event.data.type === 'REQUEST' &&
      !allowedRequestDomains.some((allowDomainRegEx) =>
        allowDomainRegEx.test(event.origin)
      )
    )
      return;

    // 'RESPONSE' should come from googleusercontent.com
    if (
      event.data.type === 'RESPONSE' &&
      !allowedResponseDomains.some((allowDomainRegEx) =>
        allowDomainRegEx.test(event.origin)
      )
    )
      return;

    const request = event.data;

    // This prevents duplicate requests. No requests should have the same id.
    // It also solves the infinite loop issue when a page is loaded outside an iframe
    // and localhost sends and responds to localhost.
    if (request.type === 'REQUEST' && requestIdList[request.id]) {
      console.warn(
        'There was an error. This page was probably run outside a Google Apps Script window.'
      );
      return;
    }
    if (request.type === 'REQUEST') {
      requestIdList[request.id] = true;
      window.parent.postMessage(event.data, '*');
    }
    if (request.type === 'RESPONSE') {
      iframe[0].contentWindow.postMessage(event.data, '*');
    }
  };

  window.addEventListener('message', receiveMessage, false);

  status.text('Connecting to sockjs server...');
  $errors.hide();
  iframe.hide();
  header.css({
    borderColor: '#96b5b4',
  });
  okness.css({
    color: 'rgb(84, 84, 84)',
  });

  const onSocketMsg = {
    hot() {
      hot = true;
      iframe.attr('src', contentPage + window.location.hash);
    },
    invalid() {
      okness.text('');
      status.text('App updated. Recompiling...');
      status.css({
        color: 'rgb(84, 84, 84)',
      });
      setTimeout(() => {
        status.css({
          color: 'transparent',
        });
      }, 3000);
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
      status.css({
        color: 'rgb(84, 84, 84)',
      });
      setTimeout(() => {
        status.css({
          color: 'transparent',
        });
      }, 3000);
      header.css({
        borderColor: 'transparent',
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
      setTimeout(() => {
        okness.css({
          color: 'transparent',
        });
      }, 2000);
      $errors.hide();
      reloadApp();
    },
    errors: function msgErrors(errors) {
      status.text('App updated with errors. No reload!');
      status.css({
        color: 'rgb(84, 84, 84)',
      });
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

  socket('/sockjs-node', onSocketMsg);

  iframe.on('load', () => {
    status.text('App ready.');
    status.css({
      color: 'rgb(84, 84, 84)',
    });
    setTimeout(() => {
      status.css({
        color: 'transparent',
      });
    }, 3000);
    header.css({
      borderColor: 'transparent',
    });
    iframe.show();
  });

  function reloadApp() {
    if (hot) {
      status.text('App hot update.');
      status.css({
        color: 'rgb(84, 84, 84)',
      });
      try {
        iframe[0].contentWindow.postMessage(
          `webpackHotUpdate${currentHash}`,
          '*'
        );
      } catch (e) {
        console.warn(e); // eslint-disable-line
      }
      iframe.show();
    } else {
      status.text('App updated. Reloading app...');
      status.css({
        color: 'rgb(84, 84, 84)',
      });
      header.css({
        borderColor: '#96b5b4',
      });
      try {
        let old = `${iframe[0].contentWindow.location}`;
        if (old.indexOf('about') === 0) {
          old = null;
        }
        iframe.attr('src', old || contentPage + window.location.hash);
        if (old) {
          iframe[0].contentWindow.location.reload();
        }
      } catch (e) {
        iframe.attr('src', contentPage + window.location.hash);
      }
    }
  }
});
