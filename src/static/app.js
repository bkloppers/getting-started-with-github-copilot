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
            li.textContent = participantLabel(p);
            participantsListEl.appendChild(li);
          });
          if (participants.length > displayCount) {
            const moreLi = document.createElement("li");
            moreLi.className = "more";
            moreLi.textContent = `+${participants.length - displayCount} more`;
            participantsListEl.appendChild(moreLi);
          }
        } else {
          const li = document.createElement("li");
          li.className = "muted";
          li.textContent = "No participants yet";
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
