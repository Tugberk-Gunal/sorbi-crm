/* CRM ve Risk Takip aynı origin'de ayrı kayıt anahtarları kullanır. */
function syncRiskTheme() {
  try {
    document.body.classList.toggle(
      "dark",
      localStorage.getItem("sorbi_theme") === "dark"
    );
  } catch (error) {
    document.body.classList.remove("dark");
  }
}

syncRiskTheme();
window.addEventListener("storage", event => {
  if (event.key === "sorbi_theme") {
    syncRiskTheme();
  }
});
