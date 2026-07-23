(() => {
  // dashboard.jsx
  var { useState, useEffect, useCallback } = React;
  var API = window.LP_CONFIG.API_BASE;
  function authHeaders() {
    const token = localStorage.getItem("lp_token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }
  async function apiFetch(path, opts = {}) {
    var _a;
    const res = await fetch(`${API}${path}`, { ...opts, headers: authHeaders() });
    if (res.status === 401) {
      localStorage.removeItem("lp_token");
      window.location.href = "/index.html";
      throw new Error("Session expired");
    }
    const isJson = (_a = res.headers.get("content-type")) == null ? void 0 : _a.includes("application/json");
    const data = isJson ? await res.json() : null;
    if (!res.ok) throw new Error((data == null ? void 0 : data.error) || `Request failed (${res.status})`);
    return data;
  }
  function PulseLogo() {
    return /* @__PURE__ */ React.createElement("svg", { width: "26", height: "18", viewBox: "0 0 60 20" }, /* @__PURE__ */ React.createElement("polyline", { className: "pulse-line", points: "0,10 14,10 19,2 25,18 31,10 60,10" }));
  }
  function NewOwnerModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ email: "", password: "", businessName: "", address: "" });
    const [err, setErr] = useState("");
    const [saving, setSaving] = useState(false);
    const submit = async (e) => {
      e.preventDefault();
      setSaving(true);
      setErr("");
      try {
        await apiFetch("/api/auth/owners", { method: "POST", body: JSON.stringify(form) });
        onCreated();
        onClose();
      } catch (e2) {
        setErr(e2.message);
      } finally {
        setSaving(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "modal-backdrop", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "modal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("h2", null, "New owner account"), /* @__PURE__ */ React.createElement("form", { onSubmit: submit }, /* @__PURE__ */ React.createElement("label", null, "Owner email"), /* @__PURE__ */ React.createElement("input", { required: true, type: "email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }) }), /* @__PURE__ */ React.createElement("label", null, "Temporary password"), /* @__PURE__ */ React.createElement("input", { required: true, type: "text", value: form.password, onChange: (e) => setForm({ ...form, password: e.target.value }) }), /* @__PURE__ */ React.createElement("label", null, "Business name"), /* @__PURE__ */ React.createElement("input", { required: true, value: form.businessName, onChange: (e) => setForm({ ...form, businessName: e.target.value }) }), /* @__PURE__ */ React.createElement("label", null, "Address (Tempe, AZ)"), /* @__PURE__ */ React.createElement("input", { value: form.address, onChange: (e) => setForm({ ...form, address: e.target.value }), placeholder: "e.g. 500 S Mill Ave, Tempe, AZ" }), err && /* @__PURE__ */ React.createElement("div", { className: "err" }, err), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn secondary", onClick: onClose }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn", disabled: saving }, saving ? "Creating\u2026" : "Create account")))));
  }
  function EditModal({ business, onClose, onSaved }) {
    const [form, setForm] = useState({
      name: business.name || "",
      address: business.address || "",
      yelpId: business.yelp_id || "",
      googlePlaceId: business.google_place_id || ""
    });
    const [err, setErr] = useState("");
    const [saving, setSaving] = useState(false);
    const submit = async (e) => {
      e.preventDefault();
      setSaving(true);
      setErr("");
      try {
        await apiFetch(`/api/businesses/${business.id}`, { method: "PUT", body: JSON.stringify(form) });
        onSaved();
        onClose();
      } catch (e2) {
        setErr(e2.message);
      } finally {
        setSaving(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "modal-backdrop", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "modal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("h2", null, "Edit business"), /* @__PURE__ */ React.createElement("form", { onSubmit: submit }, /* @__PURE__ */ React.createElement("label", null, "Name"), /* @__PURE__ */ React.createElement("input", { required: true, value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) }), /* @__PURE__ */ React.createElement("label", null, "Address"), /* @__PURE__ */ React.createElement("input", { value: form.address, onChange: (e) => setForm({ ...form, address: e.target.value }) }), /* @__PURE__ */ React.createElement("label", null, "Yelp business ID (pin manually, optional)"), /* @__PURE__ */ React.createElement("input", { value: form.yelpId, onChange: (e) => setForm({ ...form, yelpId: e.target.value }) }), /* @__PURE__ */ React.createElement("label", null, "Google Place ID (pin manually, optional)"), /* @__PURE__ */ React.createElement("input", { value: form.googlePlaceId, onChange: (e) => setForm({ ...form, googlePlaceId: e.target.value }) }), err && /* @__PURE__ */ React.createElement("div", { className: "err" }, err), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn secondary", onClick: onClose }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn", disabled: saving }, saving ? "Saving\u2026" : "Save changes")))));
  }
  function AdvisorModal({ business, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [asking, setAsking] = useState(false);
    const [err, setErr] = useState("");
    useEffect(() => {
      apiFetch(`/api/businesses/${business.id}/chat`).then((d) => setMessages(d.messages)).catch((e) => setErr(e.message)).finally(() => setLoading(false));
    }, [business.id]);
    const ask = async (e) => {
      e.preventDefault();
      const question = input.trim();
      setAsking(true);
      setErr("");
      try {
        const data = await apiFetch(`/api/businesses/${business.id}/advisor`, {
          method: "POST",
          body: JSON.stringify({ message: question || void 0 })
        });
        setMessages((prev) => [...prev, { role: "user", content: question || "(summary request)" }, { role: "assistant", content: data.reply }]);
        setInput("");
      } catch (e2) {
        setErr(e2.message);
      } finally {
        setAsking(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "modal-backdrop", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "modal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("h2", null, "AI advisor \u2014 ", business.name), loading ? /* @__PURE__ */ React.createElement("div", { className: "loading" }, "Loading history\u2026") : /* @__PURE__ */ React.createElement("div", { className: "chat-log" }, messages.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "loading" }, "No conversation yet. Ask for a summary below."), messages.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `chat-msg ${m.role}` }, m.content))), /* @__PURE__ */ React.createElement("form", { onSubmit: ask }, /* @__PURE__ */ React.createElement("label", null, "Ask about your ratings & reviews"), /* @__PURE__ */ React.createElement("textarea", { rows: "2", placeholder: "Leave blank for a general summary\u2026", value: input, onChange: (e) => setInput(e.target.value) }), err && /* @__PURE__ */ React.createElement("div", { className: "err" }, err), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn secondary", onClick: onClose }, "Close"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn", disabled: asking }, asking ? "Thinking\u2026" : "Ask")))));
  }
  function BusinessCard({ biz, isAdmin, onChanged }) {
    var _a, _b;
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(false);
    const [advising, setAdvising] = useState(false);
    const [err, setErr] = useState("");
    const refresh = async () => {
      setRefreshing(true);
      setErr("");
      try {
        await apiFetch(`/api/businesses/${biz.id}/refresh`, { method: "POST" });
        onChanged();
      } catch (e) {
        setErr(e.message);
      } finally {
        setRefreshing(false);
      }
    };
    const remove = async () => {
      if (!confirm(`Delete ${biz.name}? This also deletes its chat history.`)) return;
      try {
        await apiFetch(`/api/businesses/${biz.id}`, { method: "DELETE" });
        onChanged();
      } catch (e) {
        setErr(e.message);
      }
    };
    const yelp = (_a = biz.cached_data) == null ? void 0 : _a.yelp;
    const google = (_b = biz.cached_data) == null ? void 0 : _b.google;
    return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("h3", null, biz.name), biz.address && /* @__PURE__ */ React.createElement("div", { className: "addr" }, biz.address), /* @__PURE__ */ React.createElement("div", { className: "stats" }, /* @__PURE__ */ React.createElement("div", { className: "stat" }, /* @__PURE__ */ React.createElement("div", { className: "num" }, yelp && !yelp.error ? `${yelp.rating}\u2605` : "\u2014"), /* @__PURE__ */ React.createElement("div", { className: "lbl" }, "Yelp (", yelp && !yelp.error ? yelp.reviewCount : 0, ")")), /* @__PURE__ */ React.createElement("div", { className: "stat" }, /* @__PURE__ */ React.createElement("div", { className: "num" }, google && !google.error ? `${google.rating}\u2605` : "\u2014"), /* @__PURE__ */ React.createElement("div", { className: "lbl" }, "Google (", google && !google.error ? google.userRatingsTotal : 0, ")"))), biz.cached_at && /* @__PURE__ */ React.createElement("div", { className: "addr", style: { marginTop: 10 } }, "Last refreshed ", new Date(biz.cached_at).toLocaleString()), err && /* @__PURE__ */ React.createElement("div", { className: "err" }, err), /* @__PURE__ */ React.createElement("div", { className: "card-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: refresh, disabled: refreshing }, refreshing ? "Refreshing\u2026" : "Refresh live data"), /* @__PURE__ */ React.createElement("button", { className: "btn secondary", onClick: () => setAdvising(true) }, "AI advisor"), /* @__PURE__ */ React.createElement("button", { className: "btn secondary", onClick: () => setEditing(true) }, "Edit"), isAdmin && /* @__PURE__ */ React.createElement("button", { className: "btn danger", onClick: remove }, "Delete")), editing && /* @__PURE__ */ React.createElement(EditModal, { business: biz, onClose: () => setEditing(false), onSaved: onChanged }), advising && /* @__PURE__ */ React.createElement(AdvisorModal, { business: biz, onClose: () => setAdvising(false) }));
  }
  function App() {
    const [user] = useState(() => JSON.parse(localStorage.getItem("lp_user") || "null"));
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [showNewOwner, setShowNewOwner] = useState(false);
    const load = useCallback(async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await apiFetch("/api/businesses");
        setBusinesses(data.businesses);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    if (!user) {
      window.location.href = "/index.html";
      return null;
    }
    const isAdmin = user.role === "admin";
    const signOut = () => {
      localStorage.removeItem("lp_token");
      localStorage.removeItem("lp_user");
      window.location.href = "/index.html";
    };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("div", { className: "brand" }, /* @__PURE__ */ React.createElement(PulseLogo, null), /* @__PURE__ */ React.createElement("h1", null, "LOCALPulse"), /* @__PURE__ */ React.createElement("span", { className: "role-badge" }, user.role)), /* @__PURE__ */ React.createElement("button", { className: "signout", onClick: signOut }, "Sign out (", user.email, ")")), /* @__PURE__ */ React.createElement("main", null, /* @__PURE__ */ React.createElement("div", { className: "toolbar" }, /* @__PURE__ */ React.createElement("h2", null, isAdmin ? "All businesses" : "Your business"), isAdmin && /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: () => setShowNewOwner(true) }, "+ New owner account")), loading && /* @__PURE__ */ React.createElement("div", { className: "loading" }, "Loading\u2026"), err && /* @__PURE__ */ React.createElement("div", { className: "err" }, err), !loading && businesses.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "empty" }, "No businesses yet. ", isAdmin ? "Create an owner account to get started." : ""), /* @__PURE__ */ React.createElement("div", { className: "grid" }, businesses.map((b) => /* @__PURE__ */ React.createElement(BusinessCard, { key: b.id, biz: b, isAdmin, onChanged: load })))), showNewOwner && /* @__PURE__ */ React.createElement(NewOwnerModal, { onClose: () => setShowNewOwner(false), onCreated: load }));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
})();
