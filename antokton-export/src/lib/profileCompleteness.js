const filled = (value) => String(value || "").trim().length > 0;

export function getProfileCompletionStatus(user = {}) {
  const checks = [
    { label: "emri", ok: filled(user.first_name) },
    { label: "mbiemri", ok: filled(user.surname) },
    { label: "numri i telefonit", ok: filled(user.phone) },
    { label: "vendlindja", ok: filled(user.birthplace) },
    { label: "ditëlindja", ok: filled(user.birth_date || user.birthday || user.date_of_birth) },
    { label: "vendbanimi", ok: filled(user.location || user.current_city || user.current_country) },
    { label: "fotoja e profilit", ok: filled(user.profile_photo_url) },
  ];

  const missing = checks.filter((item) => !item.ok);
  return {
    complete: missing.length === 0,
    missing,
    missingLabels: missing.map((item) => item.label),
  };
}

export function requireCompleteProfileForInteraction(user, actionLabel = "këtë veprim") {
  const status = getProfileCompletionStatus(user);
  if (status.complete) return true;

  window.alert(
    `Për të bërë ${actionLabel}, fillimisht kompleto profilin me informacionet bazë: ${status.missingLabels.join(", ")}.`
  );
  window.location.href = "/Profile?complete=1";
  return false;
}
