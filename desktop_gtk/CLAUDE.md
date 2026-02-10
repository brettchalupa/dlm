# gtk-rs-template

A starter template for GTK4 + libadwaita applications in Rust. Use this as a
foundation for building modern Linux desktop apps.

MANDATORY: ensure `just ok` passes after making all changes with no errors or
warnings and a 0 exit status. Fix any issues that arise.

---

# Rust Development Guide

- When adding crates, use `cargo info CRATE_NAME` to ensure you're adding the
  latest version
- Write well factored, idiomatic Rust code
- Ensure changes are covered by tests
- Don't ignore warnings and errors, fix them!

# GTK4-RS Development Guide

This guide covers developing Rust applications with GTK4 using the gtk4-rs
bindings.

## Project Setup

### Dependencies

```toml
[dependencies]
gtk = { package = "gtk4", version = "0.10", features = ["v4_12"] }
```

Use feature flags to opt into API from specific GTK 4 minor releases (e.g.,
`v4_12`).

### Verify GTK Installation

```bash
pkg-config --modversion gtk4
```

### Minimal Application

```rust
use gtk::prelude::*;
use gtk::{Application, ApplicationWindow, Button};

const APP_ID: &str = "org.example.MyApp";

fn main() -> glib::ExitCode {
    let app = Application::builder()
        .application_id(APP_ID)
        .build();

    app.connect_activate(build_ui);
    app.run()
}

fn build_ui(application: &Application) {
    let window = ApplicationWindow::builder()
        .application(application)
        .title("My App")
        .default_width(300)
        .default_height(200)
        .build();

    let button = Button::builder()
        .label("Click me!")
        .margin_top(12)
        .margin_bottom(12)
        .margin_start(12)
        .margin_end(12)
        .build();

    button.connect_clicked(|button| {
        button.set_label("Clicked!");
    });

    window.set_child(Some(&button));
    window.present();
}
```

## Core Concepts

### Widget Hierarchy

All widgets inherit from `GObject` -> `Widget` -> specific widget type. Import
the prelude to access trait methods:

```rust
use gtk::prelude::*;
```

### Builder Pattern (Preferred)

Always use the builder pattern for widget construction:

```rust
let button = gtk::Button::builder()
    .label("Click Me!")
    .margin_top(10)
    .margin_bottom(10)
    .halign(gtk::Align::Center)
    .build();
```

### Signal Handling

Connect to signals using `connect_*` methods:

```rust
button.connect_clicked(|button| {
    button.set_label("Clicked!");
});
```

For capturing external state, use `glib::clone!` macro with weak references:

```rust
use glib::clone;

button.connect_clicked(clone!(
    #[weak]
    window,
    #[weak]
    label,
    move |_| {
        label.set_text("Button was clicked");
        window.set_title(Some("Updated"));
    }
));
```

### Interior Mutability in Closures

Closures require `'static` lifetimes. Use `Cell`/`RefCell` for mutability:

```rust
use std::cell::Cell;
use std::rc::Rc;

let counter = Rc::new(Cell::new(0));

button.connect_clicked(clone!(
    #[strong]
    counter,
    move |button| {
        counter.set(counter.get() + 1);
        button.set_label(&format!("Clicked {} times", counter.get()));
    }
));
```

### Properties

Access widget properties via getters/setters or property binding:

```rust
// Direct access
switch.set_active(true);
let is_active = switch.is_active();

// Property binding (automatic sync)
source.bind_property("active", &target, "sensitive")
    .bidirectional()
    .build();

// With transformation
source.bind_property("value", &target, "label")
    .transform_to(|_, value: i32| Some(format!("Value: {}", value)))
    .build();
```

## Custom Widgets

### Two-File Structure

Custom widgets use a two-struct pattern:

**mod.rs** - Public wrapper:

```rust
mod imp;

use glib::Object;
use gtk::glib;

glib::wrapper! {
    pub struct CustomButton(ObjectSubclass<imp::CustomButton>)
        @extends gtk::Button, gtk::Widget,
        @implements gtk::Accessible, gtk::Actionable, gtk::Buildable;
}

impl CustomButton {
    pub fn new() -> Self {
        Object::builder().build()
    }

    pub fn with_label(label: &str) -> Self {
        Object::builder().property("label", label).build()
    }
}

impl Default for CustomButton {
    fn default() -> Self {
        Self::new()
    }
}
```

**imp.rs** - Private implementation:

```rust
use std::cell::Cell;
use glib::Properties;
use gtk::glib;
use gtk::prelude::*;
use gtk::subclass::prelude::*;

#[derive(Properties, Default)]
#[properties(wrapper_type = super::CustomButton)]
pub struct CustomButton {
    #[property(get, set)]
    count: Cell<i32>,
}

#[glib::object_subclass]
impl ObjectSubclass for CustomButton {
    const NAME: &'static str = "MyAppCustomButton";
    type Type = super::CustomButton;
    type ParentType = gtk::Button;
}

#[glib::derived_properties]
impl ObjectImpl for CustomButton {
    fn constructed(&self) {
        self.parent_constructed();

        let obj = self.obj();
        obj.connect_clicked(|button| {
            let count = button.count() + 1;
            button.set_count(count);
            button.set_label(&format!("Clicked {} times", count));
        });
    }
}

impl WidgetImpl for CustomButton {}
impl ButtonImpl for CustomButton {}
```

### Lifecycle Methods

- `constructed()` - Called after object creation, use for initialization
- `dispose()` - Called during cleanup, unparent child widgets here

## Composite Templates

For complex UIs, separate structure (XML) from logic (Rust).

### Template File (window.ui)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<interface>
  <template class="MyAppWindow" parent="GtkApplicationWindow">
    <property name="title">My App</property>
    <property name="default-width">600</property>
    <property name="default-height">400</property>
    <child>
      <object class="GtkBox">
        <property name="orientation">vertical</property>
        <property name="spacing">12</property>
        <property name="margin-top">12</property>
        <property name="margin-bottom">12</property>
        <property name="margin-start">12</property>
        <property name="margin-end">12</property>
        <child>
          <object class="GtkLabel" id="label">
            <property name="label">Hello, World!</property>
          </object>
        </child>
        <child>
          <object class="GtkButton" id="button">
            <property name="label">Click Me</property>
            <signal name="clicked" handler="on_button_clicked"/>
          </object>
        </child>
      </object>
    </child>
  </template>
</interface>
```

### Template Implementation (imp.rs)

```rust
use gtk::glib;
use gtk::prelude::*;
use gtk::subclass::prelude::*;
use gtk::CompositeTemplate;

#[derive(CompositeTemplate, Default)]
#[template(file = "window.ui")]
pub struct Window {
    #[template_child]
    pub label: TemplateChild<gtk::Label>,
    #[template_child]
    pub button: TemplateChild<gtk::Button>,
}

#[glib::object_subclass]
impl ObjectSubclass for Window {
    const NAME: &'static str = "MyAppWindow";
    type Type = super::Window;
    type ParentType = gtk::ApplicationWindow;

    fn class_init(klass: &mut Self::Class) {
        klass.bind_template();
        klass.bind_template_callbacks();
    }

    fn instance_init(obj: &glib::subclass::InitializingObject<Self>) {
        obj.init_template();
    }
}

#[gtk::template_callbacks]
impl Window {
    #[template_callback]
    fn on_button_clicked(&self) {
        self.label.set_text("Button clicked!");
    }
}

impl ObjectImpl for Window {}
impl WidgetImpl for Window {}
impl WindowImpl for Window {}
impl ApplicationWindowImpl for Window {}
```

### Resource Compilation (build.rs)

```rust
fn main() {
    glib_build_tools::compile_resources(
        &["resources"],
        "resources/resources.gresource.xml",
        "myapp.gresource",
    );
}
```

### Resource Registration (main.rs)

```rust
gio::resources_register_include!("myapp.gresource")
    .expect("Failed to register resources");
```

## List Widgets

### Simple ListBox (< 1000 items)

```rust
let listbox = gtk::ListBox::new();
for item in items {
    let row = gtk::ListBoxRow::new();
    let label = gtk::Label::new(Some(&item));
    row.set_child(Some(&label));
    listbox.append(&row);
}
```

### Scalable ListView (> 1000 items)

Uses Model-Factory-View pattern for efficient widget recycling:

```rust
// 1. Create Model
let model = gio::ListStore::new::<DataObject>();
for data in dataset {
    model.append(&DataObject::new(&data));
}

// 2. Create Factory
let factory = gtk::SignalListItemFactory::new();

factory.connect_setup(|_, item| {
    let item = item.downcast_ref::<gtk::ListItem>().unwrap();
    let label = gtk::Label::new(None);
    item.set_child(Some(&label));
});

factory.connect_bind(|_, item| {
    let item = item.downcast_ref::<gtk::ListItem>().unwrap();
    let label = item.child().and_downcast::<gtk::Label>().unwrap();
    let data = item.item().and_downcast::<DataObject>().unwrap();
    label.set_text(&data.name());
});

// 3. Create View
let selection = gtk::SingleSelection::new(Some(model));
let list_view = gtk::ListView::new(Some(selection), Some(factory));
```

### Expressions (Better than bindings for lists)

```rust
factory.connect_setup(|_, item| {
    let item = item.downcast_ref::<gtk::ListItem>().unwrap();
    let label = gtk::Label::new(None);

    // Expression automatically handles widget recycling
    item.property_expression("item")
        .chain_property::<DataObject>("name")
        .bind(&label, "label", gtk::Widget::NONE);

    item.set_child(Some(&label));
});
```

### Filtering and Sorting

```rust
// Filter
let filter = gtk::CustomFilter::new(|obj| {
    let data = obj.downcast_ref::<DataObject>().unwrap();
    data.is_visible()
});
let filter_model = gtk::FilterListModel::new(Some(model), Some(filter.clone()));

// Sort
let sorter = gtk::CustomSorter::new(|a, b| {
    let a = a.downcast_ref::<DataObject>().unwrap();
    let b = b.downcast_ref::<DataObject>().unwrap();
    a.name().cmp(&b.name()).into()
});
let sort_model = gtk::SortListModel::new(Some(filter_model), Some(sorter.clone()));

// Update when data changes
filter.changed(gtk::FilterChange::Different);
sorter.changed(gtk::SorterChange::Different);
```

## Actions

### Simple Action

```rust
let action = gio::SimpleAction::new("close", None);
action.connect_activate(clone!(
    #[weak]
    window,
    move |_, _| {
        window.close();
    }
));
window.add_action(&action);

// Keyboard shortcut
app.set_accels_for_action("win.close", &["<Control>W"]);
```

### Stateful Action

```rust
let action = gio::SimpleAction::new_stateful(
    "dark-mode",
    None,
    &false.to_variant(),
);
action.connect_activate(|action, _| {
    let current = action.state().unwrap().get::<bool>().unwrap();
    action.set_state(&(!current).to_variant());
});
```

## Async Patterns

### CPU-Bound Work

```rust
gio::spawn_blocking(move || {
    // Runs on thread pool
    let result = expensive_computation();
    result
})
.await
.expect("Task failed");
```

### I/O-Bound Work (GLib Main Loop)

```rust
glib::spawn_future_local(async move {
    let response = reqwest::get("https://api.example.com/data").await;
    label.set_text(&response.unwrap().text().await.unwrap());
});
```

### Tokio Integration

```rust
use std::sync::OnceLock;

static RUNTIME: OnceLock<tokio::runtime::Runtime> = OnceLock::new();

fn runtime() -> &'static tokio::runtime::Runtime {
    RUNTIME.get_or_init(|| tokio::runtime::Runtime::new().unwrap())
}

// In callback:
let (sender, receiver) = async_channel::bounded(1);

runtime().spawn(async move {
    let result = async_operation().await;
    sender.send(result).await.unwrap();
});

glib::spawn_future_local(async move {
    while let Ok(result) = receiver.recv().await {
        label.set_text(&result);
    }
});
```

## CSS Styling

### Loading CSS

```rust
fn load_css() {
    let provider = gtk::CssProvider::new();
    provider.load_from_string(include_str!("style.css"));

    gtk::style_context_add_provider_for_display(
        &gdk::Display::default().unwrap(),
        &provider,
        gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
    );
}
```

### CSS Selectors

```css
/* Element */
button {
  background: blue;
}

/* Class */
button.suggested-action {
  background: green;
}

/* ID */
#submit-button {
  font-weight: bold;
}

/* Pseudo-class */
button:hover {
  background: lightblue;
}

/* Custom widget */
my-custom-widget {
  padding: 12px;
}
```

### Adding CSS Classes

```rust
button.add_css_class("suggested-action");
button.add_css_class("destructive-action");

// Set widget name for ID selector
button.set_widget_name("submit-button");
```

### Custom Widget CSS Name

```rust
impl WidgetImpl for CustomWidget {
    fn class_init(klass: &mut Self::Class) {
        klass.set_css_name("my-custom-widget");
    }
}
```

## Settings (GSettings)

### Schema (org.example.myapp.gschema.xml)

```xml
<?xml version="1.0"?>
<schemalist>
  <schema id="org.example.myapp" path="/org/example/myapp/">
    <key name="window-width" type="i">
      <default>800</default>
    </key>
    <key name="dark-mode" type="b">
      <default>false</default>
    </key>
  </schema>
</schemalist>
```

### Using Settings

```rust
let settings = gio::Settings::new("org.example.myapp");

// Read/write
let width = settings.int("window-width");
settings.set_int("window-width", 1024).unwrap();

// Bind to widget property
settings.bind("window-width", &window, "default-width")
    .build();

// Create action from setting
if let Some(action) = settings.create_action("dark-mode") {
    window.add_action(&action);
}
```

## Dialogs

### AlertDialog (Modern)

```rust
let dialog = gtk::AlertDialog::builder()
    .message("Confirm Action")
    .detail("Are you sure you want to proceed?")
    .buttons(["Cancel", "Confirm"])
    .default_button(1)
    .cancel_button(0)
    .build();

glib::spawn_future_local(clone!(
    #[weak]
    window,
    async move {
        let response = dialog.choose_future(Some(&window)).await;
        if response == 1 {
            // User confirmed
        }
    }
));
```

### AboutDialog

```rust
let about = gtk::AboutDialog::builder()
    .program_name("My App")
    .version("1.0.0")
    .authors(["Author Name"])
    .website("https://example.com")
    .license_type(gtk::License::MitX11)
    .build();
about.present();
```

## Common Patterns

### Application Structure

```
my-app/
├── src/
│   ├── main.rs           # Entry point, app setup
│   ├── application/      # Custom Application subclass
│   │   ├── mod.rs
│   │   └── imp.rs
│   ├── window/           # Main window
│   │   ├── mod.rs
│   │   └── imp.rs
│   └── widgets/          # Custom widgets
│       ├── mod.rs
│       └── custom_widget/
│           ├── mod.rs
│           └── imp.rs
├── resources/
│   ├── window.ui
│   ├── style.css
│   └── resources.gresource.xml
└── Cargo.toml
```

### Common Gotchas

| Problem                              | Solution                                                |
| ------------------------------------ | ------------------------------------------------------- |
| "closure may outlive" error          | Use `move` keyword or `glib::clone!`                    |
| "cannot assign to captured variable" | Use `Cell<T>` or `RefCell<T>`                           |
| Reference cycle / memory leak        | Use `#[weak]` in `glib::clone!`                         |
| UI freezes during long operation     | Use `gio::spawn_blocking` or `glib::spawn_future_local` |
| Template child not found             | Ensure `id` in XML matches field name                   |
| Bindings not updating in lists       | Use expressions instead of bindings                     |
| GObject not thread-safe              | Use channels for thread communication                   |
| "RefCell already borrowed" panic     | Drop borrow before triggering callbacks (see below)     |

### RefCell Borrow Panic Pattern

**CRITICAL:** When using `Rc<RefCell<State>>` with GTK signals, you must drop
the borrow before calling any method that triggers a callback which might also
borrow the state.

**Problem:**

```rust
// THIS WILL PANIC!
button.connect_clicked(clone!(
    #[strong] state,
    #[strong] widgets,
    move |_| {
        let mut s = state.borrow_mut();  // Borrow starts
        s.selected_index += 1;
        // select_row triggers row_selected callback, which also borrows state
        widgets.list.select_row(Some(&row));  // PANIC: RefCell already borrowed
    }  // Borrow would end here, but we never get here
));
```

**Solution:** Scope the borrow so it drops before triggering callbacks:

```rust
button.connect_clicked(clone!(
    #[strong] state,
    #[strong] widgets,
    move |_| {
        let new_index = {
            let mut s = state.borrow_mut();
            s.selected_index += 1;
            s.selected_index
        };  // Borrow dropped here

        // Now safe to trigger callbacks
        if let Some(row) = widgets.list.row_at_index(new_index as i32) {
            widgets.list.select_row(Some(&row));
        }
    }
));
```

This pattern applies to any situation where:

1. You hold a `borrow()` or `borrow_mut()` on state
2. You call a GTK method that emits a signal (e.g., `select_row`, `set_active`,
   `emit_clicked`)
3. A connected callback also tries to borrow the same state

### Key Macros

- `glib::clone!` - Safe closure captures with weak references
- `glib::wrapper!` - Create public wrapper around GObject
- `#[glib::object_subclass]` - Declare ObjectSubclass
- `#[derive(gtk::CompositeTemplate)]` - Enable template loading
- `#[template_child]` - Mark template child fields
- `#[template_callback]` - Mark signal handler methods
- `#[derive(glib::Properties)]` - Derive property definitions
- `#[glib::derived_properties]` - Auto-implement ObjectImpl for properties

## Debugging

Press `Ctrl+Shift+D` in a focused GTK window to open the GTK Inspector for
debugging widgets, CSS, and properties.
