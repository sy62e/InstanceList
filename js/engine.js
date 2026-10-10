const instanceList = document.querySelector(".instance-list");

      function validateInstances(data) {
        if (!data || !Array.isArray(data.instances)) {
          throw new TypeError('instances.json must contain an "instances" array.');
        }

        return data.instances.map((instance, index) => {
          if (
            !instance ||
            typeof instance.name !== "string" ||
            typeof instance.url !== "string"
          ) {
            throw new TypeError(
              `Instance ${index + 1} must have string "name" and "url" values.`,
            );
          }

          const url = new URL(instance.url);
          if (!["http:", "https:"].includes(url.protocol)) {
            throw new TypeError(`Instance ${index + 1} URL must use HTTP or HTTPS.`);
          }

          if (instance.image != null && typeof instance.image !== "string") {
            throw new TypeError(`Instance ${index + 1} image must be a URL string.`);
          }

          if (instance.verified != null && typeof instance.verified !== "boolean") {
            throw new TypeError(
              `Instance ${index + 1} verified value must be a boolean.`,
            );
          }

          return { ...instance, url: url.href.replace(/\/+$/, "") };
        });
      }

      function createCard(instance) {
        const card = document.createElement("li");
        card.className = "dc-embed instance-card";

        const avatar = document.createElement("span");
        avatar.className = "instance-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = instance.name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase();

        const faviconUrl = new URL("/favicon.ico", instance.url).href;
        const imageUrl = instance.image
          ? new URL(instance.image, document.baseURI).href
          : faviconUrl;
        const image = document.createElement("img");
        let triedFavicon = imageUrl === faviconUrl;

        image.alt = "";
        image.onload = () => avatar.classList.add("has-icon");
        image.onerror = () => {
          if (!triedFavicon) {
            triedFavicon = true;
            image.src = faviconUrl;
            return;
          }

          image.remove();
          avatar.classList.remove("has-icon");
        };
        image.src = imageUrl;
        avatar.append(image);

        const info = document.createElement("div");
        info.className = "instance-info";

        const name = document.createElement("div");
        name.className = "instance-name";
        if (instance.verified === true) {
          const verifiedBadgeWrap = document.createElement("span");
          verifiedBadgeWrap.className = "verified-badge-wrap";
          verifiedBadgeWrap.tabIndex = 0;
          verifiedBadgeWrap.setAttribute("role", "img");
          verifiedBadgeWrap.setAttribute("aria-label", "Verified Instance");

          const verifiedBadge = document.createElement("img");
          verifiedBadge.className = "verified-badge";
          verifiedBadge.src = "./icons/verified.svg";
          verifiedBadge.alt = "";
          verifiedBadgeWrap.append(verifiedBadge);

          const tooltip = document.createElement("span");
          tooltip.className = "verified-tooltip";
          tooltip.setAttribute("aria-hidden", "true");

          const tooltipTitle = document.createElement("span");
          tooltipTitle.className = "verified-tooltip-title";
          tooltipTitle.textContent = "Verified Instance";

          const tooltipDescription = document.createElement("span");
          tooltipDescription.textContent =
            "This server is verified because it is popular and reputable enough.";

          tooltip.append(tooltipTitle, tooltipDescription);
          verifiedBadgeWrap.append(tooltip);
          name.append(verifiedBadgeWrap);
        }
        name.append(document.createTextNode(instance.name));

        const status = document.createElement("span");
        status.className = "dc-tag status";
        status.dataset.state = "checking";
        status.setAttribute("aria-live", "polite");
        status.textContent = "Checking";
        name.append(status);

        const url = document.createElement("a");
        url.className = "dc-link instance-url";
        url.href = instance.url;
        url.textContent = instance.url;

        const action = document.createElement("a");
        action.className = "dc-btn dc-btn-blurple instance-action";
        action.href = instance.url;
        action.target = "_blank";
        action.rel = "noopener noreferrer";
        action.textContent = "Open instance";

        info.append(name, url);
        card.append(avatar, info, action);
        return { card, status };
      }

      async function checkStatus(instance, status) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        try {
          const response = await fetch(`${instance.url}/app`, {
            signal: controller.signal,
            cache: "no-store",
          });
          status.dataset.state = response.ok ? "up" : "down";
          status.textContent = response.ok ? "Up" : "Down";
        } catch {
          status.dataset.state = "down";
          status.textContent = "Down";
        } finally {
          clearTimeout(timeout);
        }
      }

      async function loadInstances() {
        try {
          const response = await fetch("./instances.json", { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`instances.json request failed (${response.status}).`);
          }

          const instances = validateInstances(await response.json());
          instanceList.replaceChildren();

          if (instances.length === 0) {
            const empty = document.createElement("li");
            empty.className = "dc-embed";
            empty.textContent = "No instances are listed.";
            instanceList.append(empty);
            return;
          }

          const statusChecks = instances.map((instance) => {
            const { card, status } = createCard(instance);
            instanceList.append(card);
            return checkStatus(instance, status);
          });
          await Promise.all(statusChecks);
        } catch (error) {
          const message = document.createElement("li");
          message.className = "dc-embed";
          message.textContent = `Unable to load instances: ${error.message}`;
          instanceList.replaceChildren(message);
          console.error("Unable to load instances.json.", error);
        }
      }

      loadInstances();