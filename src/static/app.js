document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Return early if essential container missing
  if (!activitiesList) {
    console.error("Missing #activities-list element — cannot render activities.");
    return;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      console.debug("Fetched activities:", activities);

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        // Normalize participants so missing or non-array values won't break rendering
        const participants = Array.isArray(details.participants) ? details.participants : [];

        // compute spots using normalized participants (fall back numeric)
        const maxParts = Number.isFinite(Number(details.max_participants)) ? Number(details.max_participants) : 0;
        const spotsLeft = maxParts - participants.length;

        // Build card with DOM methods (safer than innerHTML)
        const titleEl = document.createElement("h4");
        titleEl.textContent = name;
        activityCard.appendChild(titleEl);

        const descEl = document.createElement("p");
        descEl.textContent = details.description || "";
        activityCard.appendChild(descEl);

        const schedEl = document.createElement("p");
        schedEl.innerHTML = "<strong>Schedule:</strong> ";
        const schedSpan = document.createElement("span");
        schedSpan.textContent = details.schedule || "";
        schedEl.appendChild(schedSpan);
        activityCard.appendChild(schedEl);

        const availEl = document.createElement("p");
        availEl.innerHTML = "<strong>Availability:</strong> ";
        const availSpan = document.createElement("span");
        availSpan.textContent = `${spotsLeft} spots left`;
        availEl.appendChild(availSpan);
        activityCard.appendChild(availEl);

        // Create and populate participants section
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";

        const participantsTitle = document.createElement("strong");
        participantsTitle.textContent = "Participants:";
        participantsDiv.appendChild(participantsTitle);

        const participantsListEl = document.createElement("ul");
        participantsListEl.className = "participants-list";

  // Inline fallback styles to force visibility if stylesheet isn't applied
  participantsListEl.style.display = "flex";
  participantsListEl.style.flexWrap = "wrap";
  participantsListEl.style.gap = "6px";
  participantsListEl.style.paddingLeft = "0";
  // Hide default bullet points on the list
  participantsListEl.style.listStyle = "none";
  participantsListEl.style.maxHeight = "6.5rem";
  participantsListEl.style.overflow = "auto";
  participantsListEl.style.WebkitOverflowScrolling = "touch";

        // Debug helper: confirm element created and class applied
        console.debug(`Activity "${name}": participants count = ${participants.length}`, participants);

        // helper to produce a readable label from different participant shapes
        function participantLabel(p) {
          if (p == null) return "Unknown";
          if (typeof p === "string") return p;
          if (typeof p === "object") {
            return p.name || p.full_name || p.email || p.username || (p.id ? String(p.id) : JSON.stringify(p));
          }
          return String(p);
        }

        if (participants.length > 0) {
          const displayCount = Math.min(participants.length, 10);
          participants.slice(0, displayCount).forEach((p) => {
            const li = document.createElement("li");

            // label container so we can append a delete button next to it
            const labelSpan = document.createElement("span");
            labelSpan.textContent = participantLabel(p);

            // Inline badge fallback so items are visible without CSS
            li.style.display = "inline-flex";
            li.style.alignItems = "center";
            li.style.background = "#eef2ff";
            li.style.color = "#1a237e";
            li.style.padding = "6px 10px";
            li.style.borderRadius = "999px";
            li.style.fontSize = "13px";
            li.style.lineHeight = "1";
            li.style.border = "1px solid rgba(26,35,126,0.06)";
            li.style.whiteSpace = "nowrap";
            li.style.gap = "8px";

            // Create delete/unregister button
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "delete-participant";
            delBtn.title = "Unregister participant";
            // simple cross glyph; use text to avoid needing external assets
            delBtn.textContent = "×";
            // inline styles so it looks okay without CSS
            delBtn.style.marginLeft = "8px";
            delBtn.style.border = "none";
            delBtn.style.background = "transparent";
            delBtn.style.color = "#b00020";
            delBtn.style.cursor = "pointer";
            delBtn.style.fontSize = "14px";
            delBtn.style.lineHeight = "1";
            delBtn.style.padding = "0 6px";

            // click handler to unregister the participant
            delBtn.addEventListener("click", async (e) => {
              e.stopPropagation();

              // determine an identifier string to send to server
              const participantId = typeof p === "string"
                ? p
                : (p.email || p.name || p.username || (p.id ? String(p.id) : JSON.stringify(p)));

              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(participantId)}`,
                  { method: "DELETE" }
                );
                let result = {};
                try { result = await resp.json(); } catch (err) { /* ignore json parse errors */ }

                if (resp.ok) {
                  // remove the item from the UI and refresh activities to update counts
                  li.remove();
                  fetchActivities();
                  if (messageDiv) {
                    messageDiv.textContent = result.message || "Participant unregistered";
                    messageDiv.className = "success";
                    messageDiv.classList.remove("hidden");
                    setTimeout(() => messageDiv.classList.add("hidden"), 3000);
                  }
                } else {
                  if (messageDiv) {
                    messageDiv.textContent = result.detail || "Failed to unregister participant";
                    messageDiv.className = "error";
                    messageDiv.classList.remove("hidden");
                    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                  }
                }
              } catch (error) {
                console.error("Error unregistering participant:", error);
                if (messageDiv) {
                  messageDiv.textContent = "Failed to unregister. Please try again.";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                  setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                }
              }
            });

            li.appendChild(labelSpan);
            li.appendChild(delBtn);
            participantsListEl.appendChild(li);
          });
          if (participants.length > displayCount) {
            const moreLi = document.createElement("li");
            moreLi.className = "more";
            moreLi.textContent = `+${participants.length - displayCount} more`;
            moreLi.style.background = "#fff4e5";
            moreLi.style.color = "#8a5a00";
            moreLi.style.fontWeight = "600";
            moreLi.style.padding = "6px 10px";
            moreLi.style.borderRadius = "999px";
            participantsListEl.appendChild(moreLi);
          }
        } else {
          const li = document.createElement("li");
          li.className = "muted";
          li.textContent = "No participants yet";
          li.style.background = "transparent";
          li.style.color = "#888";
          li.style.padding = "0";
          li.style.border = "none";
          li.style.borderRadius = "0";
          participantsListEl.appendChild(li);
        }

        participantsDiv.appendChild(participantsListEl);
        activityCard.appendChild(participantsDiv);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown only if select exists
        if (activitySelect) {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          activitySelect.appendChild(option);
        }
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission if form exists
  if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailEl = document.getElementById("email");
      const activityEl = document.getElementById("activity");
      const email = emailEl ? emailEl.value : "";
      const activity = activityEl ? activityEl.value : "";

      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
          {
            method: "POST",
          }
        );

        const result = await response.json();

        if (response.ok) {
          if (messageDiv) {
            messageDiv.textContent = result.message;
            messageDiv.className = "success";
            signupForm.reset();
            // Refresh activities so counts and participant lists update immediately
            fetchActivities();
            messageDiv.classList.remove("hidden");
            setTimeout(() => messageDiv.classList.add("hidden"), 5000);
          }
        } else {
          if (messageDiv) {
            messageDiv.textContent = result.detail || "An error occurred";
            messageDiv.className = "error";
            messageDiv.classList.remove("hidden");
            setTimeout(() => messageDiv.classList.add("hidden"), 5000);
          }
        }
      } catch (error) {
        if (messageDiv) {
          messageDiv.textContent = "Failed to sign up. Please try again.";
          messageDiv.className = "error";
          messageDiv.classList.remove("hidden");
          setTimeout(() => messageDiv.classList.add("hidden"), 5000);
        }
        console.error("Error signing up:", error);
      }
    });
  } else {
    console.warn("No signup form found (#signup-form). Signup disabled but activities will still render.");
  }

  // Initialize app
  fetchActivities();
});
