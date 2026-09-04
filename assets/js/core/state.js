/* =========================================================
   STATE
========================================================= */

let customers = [];
let selectedCustomerId = null;
let currentFollowupFilter = "today";
let activeAvatarColorCustomerId = null;
let activeAvatarColorTarget = null;
let renewals = [];
let editingRenewalId = null;

/* =========================================================
   DOM
========================================================= */

const $ = (id) => document.getElementById(id);

const customerList = $("customerList");
const emptyState = $("emptyState");
const customerModal = $("customerModal");
const detailOverlay = $("detailOverlay");
const interactionModal = $("interactionModal");
const followupList = $("followupList");
const followupEmpty = $("followupEmpty");
const allInteractionList = $("allInteractionList");
const interactionPageEmpty = $("interactionPageEmpty");

