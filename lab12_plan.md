# Lab 12 Execution Plan for Cursor

This plan outlines the steps required to achieve the maximum score (100 points) for the Day 12 Lab submission. To ensure Cursor performs flawlessly without exceeding context limits or making critical errors, the workflow is divided into 3 logical parts. 

**Instruction for User:** Copy and paste the prompts one by one. Only run the next prompt after verifying that Cursor has successfully finished the current part and the code runs properly.

---

## Part 1: Architecture & Core API Logic (Foundation)
This step builds the structural foundation and implements all critical application logic (Security, Scaling, and Resiliency) without touching DevOps yet.

**Checklist:**
- [ ] Reorganize the code so all Python files are inside the `app/` directory (`main.py`, `config.py`, `auth.py`, `rate_limiter.py`, `cost_guard.py`).
- [ ] Implement API key authentication logic.
- [ ] Implement Redis-based rate limiting (strictly 10 req/min).
- [ ] Implement Redis-based cost guard ($10/month limit).
- [ ] Implement standard `/health` and readiness checks.
- [ ] Configure stateless design and graceful shutdown.
- [ ] Verify there are **no hardcoded secrets** (everything relies on `.env`).

**Prompt 1 for Cursor:**
> Please execute Part 1 of my lab plan. Reorganize my current codebase so it strictly uses an `app/` directory containing `main.py`, `config.py`, `auth.py`, `rate_limiter.py`, and `cost_guard.py`. Implement API endpoints that include: 1) API key authentication, 2) a Redis-based rate limiter (10 requests/minute), 3) a Redis-based cost guard logic ($10/month), 4) robust health checks, and 5) graceful shutdown behavior. Ensure the entire design is stateless using Redis and absolutely NO hardcoded secrets exist. Modify or generate the Python files necessary for this structure. Stop and wait for my verification when finished.

---

## Part 2: DevOps & Cloud Configuration
Once the core functionality is built, this step focuses on containing the app efficiently for production.

**Checklist:**
- [ ] Write an optimized, multi-stage `Dockerfile` (Final image MUST be `< 500 MB`).
- [ ] Create a comprehensive `.dockerignore` file.
- [ ] Create a `railway.toml` (or `render.yaml`) tailored for cloud deployment.
- [ ] Update `requirements.txt` to match the dependencies used in Part 1.

**Prompt 2 for Cursor:**
> Building on the code from Part 1, I need you to set up the DevOps configurations. First, write a highly optimized, multi-stage `Dockerfile` for the Python app (the final image must strictly be smaller than 500 MB). Second, create a comprehensive `.dockerignore` file to exclude redundant project assets. Third, generate a `railway.toml` configuration to deploy this Docker image properly. Finally, ensure my `requirements.txt` accurately reflects everything implemented in Part 1.

---

## Part 3: Documentation & Answers
This step uses the context of the newly created application and Docker rules to fill out the lab's required Markdown documents.

**Checklist:**
- [ ] Create `MISSION_ANSWERS.md` and intelligently fill in answers for Parts 1 to 5.
- [ ] Rewrite `README.md` to reflect proper local execution and setup tasks.

**Prompt 3 for Cursor:**
> Based on the application structure and Docker logic we have built so far, please handle the documentation for Part 3. First, you MUST read **`CODE_LAB.md`** to understand the actual questions and context for Exercises 1 to 5. Then, use the exact formatting template from **`DAY12_DELIVERY_CHECKLIST.md`** to create **`MISSION_ANSWERS.md`**. Fill logistics and technical answers based on what we implemented (e.g., explaining our multi-stage Docker logic, how we solved anti-patterns, our Redis cost guards, etc.). Second, write a professional `README.md` giving clear setup instructions on how to use the `.env.example`, run the app locally, and deploy it.

---

## Part 4: Final Deployment (Manual Steps - For User)
After Cursor completes the 3 AI prompts above, you will manually do the following:
1. Initialize Git and push the clean repo to GitHub.
2. Deploy the repository using Railway (Make sure you configure environmental variables like `AGENT_API_KEY`, `REDIS_URL`, `PORT` inside their Dashboard).
3. Take 3 screenshots: the online dashboard, running logs, and terminal API test results. Put them into a `screenshots/` directory.
4. Manually create a `DEPLOYMENT.md` listing out your public live URL, platform, and tested CURL commands.
