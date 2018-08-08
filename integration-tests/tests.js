import { Selector } from 'testcafe';
import { ClientFunction } from 'testcafe';

fixture `Integration Tests`
  // To add this user, run the backend tests
  .httpAuth({ username: 'test', password: 'fVm2CUePzGKCwoEQQdNJktUQ'})
  .beforeEach( async t => {
    const testname = t.testRun.test.name;
    const host = process.env.TEST_HOST
    const url = "http://test-" + testname + "." + host + "/admin/integration_test";
    const pageLoaded = Selector('#finishIntegrationTest').exists;
    await t
      .navigateTo(url)
      .expect(pageLoaded).ok("page timed out", {timeout: 1500})
      .takeScreenshot()
      ;
  })
  .afterEach( async t => {
    const signal = Selector('#integrationTestSignal');
    await t
      .click("#finishIntegrationTest")
      .expect(signal.exists).ok("Error checking end state (maybe crash in Elm?)")
      ;

    const { log, error } = await t.getBrowserConsoleMessages();
    await t.expect(error).eql([])


    if (await signal.hasClass("failure")) {
      console.error("msg/mod logs for: " + t.testRun.test.name);
      await t.takeScreenshot();
      for (var l of log) {
        console.error(l)
      }
      await t.expect("test state").eql(await signal.textContent);
    }

    await t.expect(signal.hasClass("success")).eql(true)
  })

//********************************
// Avoiding test race conditions
//********************************

// If you're typing using .typeText, and the text is more than 3
// characters, using { speed: 0.4 } to get testCafe to slow down a bit.
// Elm has a bug where typing quickly jumps to the end of the input box,
// and TestCafe types very quickly.
// TODO: remove from the application?
const slow = { speed: 0.4 };

// Testcafe automatically waits for the next thing you've specified. So
// if you .typeText("#entry-box", ...), it will wait for the entryBox.
// But we sometimes need to explicitly wait if TestCafe can't tell what
// we're waiting on.

function astAvailable() {
  return Selector('.ast').exists;
}
function entryBoxAvailable() {
  return Selector('#entry-box').exists;
}
function available(css) {
  return Selector(css).exists;
}

// Allow us wait for a certain autocomplete entry to be selected
function acHighlighted(content) {
  return Selector('.autocomplete-item.highlighted')
                 .withExactText(content);
}


// ------------------------
// Tests below here. Don't forget to update client/IntegrationTest.elm
// ------------------------

test('enter_changes_state', async t => {
  await t
    .pressKey("enter")
    .expect(entryBoxAvailable()).ok()
   ;
});

test('field_access', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "req", slow)
    .expect(acHighlighted("request")).ok()
    .typeText("#entry-box", ".")

    .typeText("#entry-box", "bo")
    .expect(acHighlighted("body")).ok()
    .pressKey("enter")
    ;
});


test('field_access_closes', async t => {

  // this occasionally fails in CI so keep some debug info to catch it
  // next time

  await t
    .pressKey("enter")
    .typeText("#entry-box", "req", slow)
    .expect(acHighlighted("request")).ok()
    .typeText("#entry-box", ".")

    .typeText("#entry-box", "b")
    .typeText("#entry-box", "o")
    .expect(acHighlighted("body")).ok()
    .pressKey("enter")
    ;
});

// This has a race condition somewhere
test('field_access_pipes', async t => {
  const astAvailable = Selector('.ast').exists;
  await t
    .pressKey("enter")

    .typeText("#entry-box", "req", slow)
    .expect(acHighlighted("request")).ok()
    .typeText("#entry-box", ".")

    .typeText("#entry-box", "bo", slow)
    .expect(acHighlighted("body")).ok()
    .pressKey("shift+enter")
    ;
});

test('field_access_nested', async t => {
  await t
    .pressKey("enter")

    .typeText("#entry-box", "req", slow)
    .expect(acHighlighted("request")).ok()
    .typeText("#entry-box", ".")

    .typeText("#entry-box", "bo")
    .expect(acHighlighted("body")).ok()
    .typeText("#entry-box", ".")

    .typeText("#entry-box", "field.", slow)
    .typeText("#entry-box", "field2", slow)
    .pressKey("enter")
    ;
});


test('pipeline_let_equals', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "3")
    .pressKey("shift+enter")
    .typeText("#entry-box", "=value", slow)
    .pressKey("enter")
    ;
});

test('pipe_within_let', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "3")
    .pressKey("shift+enter")
    .typeText("#entry-box", "=value", slow)
    .pressKey("enter")
    .typeText("#entry-box", "value", slow)
    .pressKey("shift+enter")
    .typeText("#entry-box", "assoc", slow)
    .pressKey("enter")
    .pressKey("esc")
    ;
});

test('tabbing_works', async t => {
  // Fill in "then" box in if stmt
  await t
    .pressKey("enter")
    .typeText("#entry-box", "if")
    .pressKey("enter")
    .pressKey("esc")
    .pressKey("tab")
    .pressKey("enter")
    .typeText("#entry-box", "5")
    .pressKey("enter")
    ;
});

test('left_right_works', async t => {
  await t
    .pressKey("enter")
    .pressKey("enter")
    .pressKey("esc")
    .pressKey("tab")
    .pressKey("right")
    .pressKey("right")
    .pressKey("right")
    .pressKey("right") // stop on final elem
    .pressKey("right")
    .pressKey("left")
    ;
});

test('varbinds_are_editable', async t => {
  await t
    .click(".letbind")
    .pressKey("enter")
    .pressKey("enter")
    ;
});

test('editing_does_not_deselect', async t => {
  await t
    .doubleClick(".ast .blankOr > .letrhs > .blankOr")
    .click("#entry-box")
});

test('editing_request_edits_request', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "req")
    .expect(acHighlighted("request")).ok()
    .typeText("#entry-box", ".")

    .pressKey("esc")
    .pressKey("left")
    .pressKey("enter")
    ;
});

test('autocomplete_highlights_on_partial_match', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "nt::add", slow)
    .expect(acHighlighted("Int::add")).ok()
    .pressKey("enter")
    ;
});

test('no_request_global_in_non_http_space', async t => {
  await t
    .pressKey("enter")
    .pressKey("enter")
    .click(".module")
    .pressKey("enter")
    .typeText("#entry-box", "NOT_HTTP_SPACE", slow)
    .pressKey("enter")
    .typeText("#entry-box", "request")
    .expect(acHighlighted("Http::badRequest")).ok()
    .pressKey("enter")
});

test('hover_values_for_varnames', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "let")
    .pressKey("enter")
    .typeText("#entry-box", "myvar", slow)
    .pressKey("enter")
    .typeText("#entry-box", "5")
    .pressKey("enter")
});


test('pressing_up_doesnt_return_to_start', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "Char::", slow)
    .expect(acHighlighted("Char::toASCIIChar")).ok()
    .pressKey("down")
    .pressKey("up")
    .expect(acHighlighted("Char::toASCIIChar")).ok()
    .typeText("#entry-box", "toASCII", slow)
    .pressKey("enter")
});

test('deleting_selects_the_blank', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "5")
    .pressKey("enter")
    .click(".ast .value")
    .pressKey("delete")
    .typeText("#entry-box", "6")
    .pressKey("enter")
});

test('right_number_of_blanks', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "assoc", slow)
    .pressKey("enter")
});

// This is how Ellen demos, and should be kept in sync with that if she
// changes.
test('ellen_hello_world_demo', async t => {
  await t
    .pressKey("enter")
    .pressKey("enter")

    // route
    .pressKey("tab")
    .typeText("#entry-box", "/hello", slow)
    .pressKey("enter")

    // space
    .typeText("#entry-box", "H")
    .pressKey("down")
    .pressKey("enter")

    // verb
    .typeText("#entry-box", "g")
    .pressKey("down")
    .pressKey("enter")

    // string
    .typeText("#entry-box", "\"Hello world!", slow)
    .pressKey("enter")
});

test('editing_headers', async t => {
  await t
    .pressKey("enter")
    .pressKey("enter")

    // add headers
    .doubleClick(".spec-header > .name")
    .typeText("#entry-box", "/hello", slow)
    .pressKey("enter")

    .doubleClick(".spec-header > .modifier")
    .typeText("#entry-box", "PO", slow)
    .expect(acHighlighted("POST")).ok()
    .pressKey("enter")

    .doubleClick(".spec-header > .module")
    .typeText("#entry-box", "HTTP", slow)
    .pressKey("enter")

    // edit them
    .doubleClick(".spec-header > .name")
    .pressKey("backspace")
    .pressKey("backspace")
    .pressKey("backspace")
    .pressKey("backspace")
    .pressKey("backspace")
    .pressKey("backspace")
    .typeText("#entry-box", "/myroute", slow)
    .pressKey("enter")

    .click(".spec-header > .modifier")
    .pressKey("delete")
    .typeText("#entry-box", "GET", slow)
    .pressKey("enter")
});

test('tabbing_through_let', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "let")
    .pressKey("enter")

    // fill in the headers first
    .pressKey("tab")
    .pressKey("tab")
    .pressKey("tab")
    .typeText("#entry-box", "/route", slow)
    .pressKey("enter")
    .typeText("#entry-box", "HTTP", slow)
    .pressKey("enter")
    .typeText("#entry-box", "GET")
    .pressKey("enter")

    // round trip through the let blanks once
    .pressKey("tab")
    .pressKey("tab")
    .pressKey("tab")

    // go to the body and fill it in
    .pressKey("tab")
    .pressKey("tab")
    .typeText("#entry-box", "5")
    .pressKey("enter")

    // go to the rhs and fill it in
    .pressKey("tab")
    .typeText("#entry-box", "5")
    .pressKey("enter")

    // fill in the var
    .typeText("#entry-box", "myvar", slow)
    .pressKey("enter")
});

test('focus_on_ast_in_new_empty_tl', async t => {
  await t
    .pressKey("enter")
    .pressKey("enter")
});

test('focus_on_path_in_new_filled_tl', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "5")
    .pressKey("enter")
});

test('focus_on_cond_in_new_tl_with_if', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "if")
    .pressKey("enter")
});

test('dont_shift_focus_after_filling_last_blank', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "5")
    .pressKey("enter")
    .typeText("#entry-box", "/")
    .pressKey("enter")
    .typeText("#entry-box", "HTTP", slow)
    .pressKey("enter")
    .typeText("#entry-box", "GET")
    .pressKey("enter")
});

test('rename_db_fields', async t => {

  const callBackend = ClientFunction(
    function () {
      var xhttp = new XMLHttpRequest();
      xhttp.open("POST", "/add", true);
      xhttp.setRequestHeader("Content-type", "application/json");
      xhttp.send('{ "field6": "a", "field2": "b" }');
    });

  // rename
  await t
    .doubleClick(Selector('.name').withText('field1'))
    .pressKey("backspace")
    .pressKey("6")
    .pressKey("tab")
    .pressKey("esc")
    ;


  // add data and check we can't rename again
  await callBackend();

  // This is super-shaky if we remove this. There's some timing things
  // around when the .fa-lock appears, and the selectors we'd expect
  // (below) doesn't work. But if we split it into two it works. Who
  // knows.
  // await t.expect(Selector('.fa-lock', {timeout: 5000})().exists).ok() ;

  await Selector('.fa-lock', {timeout: 5000})();
  await t.expect(Selector('.fa-lock').exists).ok();

  await t
    .pressKey("up")
    .pressKey("up")
    .pressKey("enter")
    ;
});

test('rename_db_type', async t => {

  const callBackend = ClientFunction(
    function () {
      var xhttp = new XMLHttpRequest();
      xhttp.open("POST", "/add", true);
      xhttp.setRequestHeader("Content-type", "application/json");
      xhttp.send('{ "field1": "a", "field2": 5 }');
    });

  // rename
  await t
    .doubleClick(Selector('.type').withText('Int'))
    .pressKey("backspace")
    .pressKey("backspace")
    .pressKey("backspace")
    .pressKey("backspace")
    .pressKey("backspace")
    .pressKey("backspace")
    .typeText("#entry-box", "String")
    .pressKey("enter")
    ;


  // add data and check we can't rename again
  await callBackend();

  // This is super-shaky if we remove this. There's some timing things
  // around when the .fa-lock appears, and the selectors we'd expect
  // (below) doesn't work. But if we split it into two it works. Who
  // knows.
  // await t.expect(Selector('.fa-lock', {timeout: 5000})().exists).ok() ;

  await Selector('.fa-lock', {timeout: 5000})();
  await t.expect(Selector('.fa-lock').exists).ok();

  await t
    .pressKey("up")
    .pressKey("left")
    .pressKey("enter")
    ;
});

test('paste_right_number_of_blanks', async t => {
  await t
    .click(Selector('.fnname').withText('-'))
    .pressKey("ctrl+c")
    .click(Selector('.fnname').withText('(+)'))
    .pressKey("ctrl+v")
});


test('paste_keeps_focus', async t => {
  await t
    .pressKey("enter")
    .pressKey("+")
    .pressKey("enter")
    .pressKey("3")
    .pressKey("enter")
    .pressKey("2")

    .click(Selector('.fnname').withText('+'))
    .pressKey("enter")
    .pressKey("ctrl+c")
    .pressKey("right")
    .pressKey("ctrl+v")
});

test('nochange_for_failed_paste', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "let")
    .pressKey("enter")
    .pressKey("x")
    .pressKey("enter")
    .pressKey("2")
    .pressKey("enter")

    .click('.letrhs')
    .pressKey("ctrl+c")
    .pressKey("left")
    .pressKey("ctrl+v")
});

test('feature_flag_works', async t => {
  await t
    // Create an empty let
    .pressKey("enter")
    .typeText("#entry-box", "let")
    .pressKey("enter")
    .typeText("#entry-box", "a")
    .pressKey("enter")
    .typeText("#entry-box", "13")
    .pressKey("enter")
    .pressKey("down")
    .pressKey("esc")

    // Click feature name
    .click('.expr-actions .flag')

    // Name it
    .doubleClick(Selector('.flag-name'))
    .typeText("#entry-box", "myflag")
    .pressKey("enter")

    // Set condition
    .typeText("#entry-box", "Int::greaterThan", slow)
    .pressKey("enter")
    .typeText("#entry-box", "a")
    .pressKey("enter")
    .typeText("#entry-box", "10")
    .pressKey("enter")

    // Case A
    .typeText("#entry-box", "\"")
    .typeText("#entry-box", "A")
    .pressKey("enter")

    // Case B
    .typeText("#entry-box", "\"")
    .typeText("#entry-box", "B")
    .pressKey("enter")

});

test('simple_tab_ordering', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "let")
    .pressKey("enter")
    .pressKey("tab")
    .pressKey("4")
    .pressKey("enter")
});

test('variable_extraction', async t => {
  await t
    .click(Selector('.fnname').withText('+'))
    .pressKey("ctrl+shift+l")
    .typeText("#entry-box", "new_variable", slow)
    .pressKey("enter")
})

// Entering text with invalid syntax leaves things the same
test('invalid_syntax', async t => {
  await t
    .pressKey("enter")
    .pressKey("enter")
    .typeText("#entry-box", "in:valid", slow)
    .pressKey("enter")
})


// When you edit, stay in the same place after pressing Enter
test('editing_stays_in_same_place_with_enter', async t => {
  await t
    .doubleClick(Selector('.letvarname'))
    .pressKey("2")
    .pressKey("enter")
})

// When you edit, go to the next blank after pressing Tab
test('editing_goes_to_next_with_tab', async t => {
  await t
    .doubleClick(Selector('.letvarname'))
    .pressKey("2")
    .pressKey("tab")
})


// When you press shift+enter, start a thread
test('editing_starts_a_thread_with_shift_enter', async t => {
  await t
    .doubleClick(Selector('.letrhs'))
    .pressKey("2")
    .pressKey("shift+enter")
})

test('object_literals_work', async t => {
  await t
    .pressKey("enter")
    .typeText("#entry-box", "{")
    .pressKey("enter")
    .typeText("#entry-box", "k1")
    .pressKey("tab")
    .pressKey("tab")
    .typeText("#entry-box", "k2")
    .pressKey("enter")
    .typeText("#entry-box", "2")
    .pressKey("tab")
    .typeText("#entry-box", "k3")
    .pressKey("enter")
    .typeText("#entry-box", "3")
    .pressKey("tab")
    .typeText("#entry-box", "k4") // Check that this opens a new row
    .pressKey("tab") // Skip the new stuff
    .pressKey("tab")
    .pressKey("tab")
    .pressKey("tab") // End right after it
})
