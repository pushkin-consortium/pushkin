# Next Steps - Games With Words Site

**Created:** October 16, 2025
**Status:** Planning Document
**Current State:** Test deployment complete at https://gww.cherriechang.com

---

## Executive Summary

The GWW site has been successfully deployed to a test subdomain with core pages complete (Home, About, Findings). Before production deployment to gameswithwords.org, we need to:

1. **Clean up technical debt** (uncommitted changes)
2. **Complete remaining content pages** (Paths, Projects, Quizzes, Archive, Updates)
3. **Migrate at least one experiment** (Listener Quiz)
4. **Comprehensive testing**
5. **Production deployment** with lab AWS account

---

## Immediate Priorities (Next Session)

### Priority 1: Technical Cleanup (MUST DO FIRST)

**Task:** Commit outstanding changes in gww-site

**Files to commit:**
```
Modified:
  pushkin/front-end/src/.env.js
  pushkin/front-end/src/.pushkin.js
  pushkin/front-end/src/components/Findings/FindingsData.js
  pushkin/front-end/src/pages/Findings.js

Untracked:
  ECStasks/
  awsResources.js
  differences/
```

**Action Steps:**
1. Review each modified file to understand changes
2. Determine if `ECStasks/`, `awsResources.js`, and `differences/` should be committed or added to `.gitignore`
3. Create appropriate commit(s) with clear conventional commit messages
4. Push to GitHub

**Why First:** Starting fresh development on uncommitted changes is risky and confusing.

**Estimated Time:** 15-30 minutes

---

### Priority 2: Complete Content Pages

**Goal:** Build remaining static content pages to match legacy site

#### 2.1 Paths Page (High Priority)

**Reference:** Check if legacy site has a Paths page or if it's just navigation

**Content Needed:**
- Research what "Paths" means in GWW context
- Check legacy site navigation structure
- Determine if it's a listing page or informational page

**Estimated Time:** 1-2 hours

#### 2.2 Projects Page (High Priority)

**Reference:** Legacy site likely has a projects listing

**Content Needed:**
- List of research projects
- Project descriptions
- Links to related experiments or findings
- Images/icons for each project

**Implementation:**
- Create `/pushkin/front-end/src/pages/Projects.js`
- May need grid or card layout
- Reference legacy site design

**Estimated Time:** 2-3 hours

#### 2.3 Quizzes Page (High Priority)

**Reference:** This should list available experiments/quizzes

**Content Needed:**
- List of all experiments available on the site
- Brief descriptions
- Links to start each experiment
- Status (active, archived, external)

**Implementation:**
- Create `/pushkin/front-end/src/pages/Quizzes.js`
- Integrate with Pushkin experiment system
- May need to link to external experiments (Which English, Vocab Quiz)

**Special Considerations:**
- This page will change as we add experiments
- Need to handle external experiment links to archive site
- Should dynamically list Pushkin experiments once we add them

**Estimated Time:** 2-4 hours

#### 2.4 Archive Page (Medium Priority)

**Reference:** Legacy site content

**Content Needed:**
- Archived experiments
- Historical data
- Links to old site if needed

**Implementation:**
- Create `/pushkin/front-end/src/pages/Archive.js`
- May link to archive.gameswithwords.org

**Estimated Time:** 1-2 hours

#### 2.5 Updates Page (Medium Priority)

**Reference:** Legacy site or may be replaced by blog

**Content Needed:**
- Site updates/news
- May be blog-like content
- Or may redirect to external blog

**Implementation:**
- Create `/pushkin/front-end/src/pages/Updates.js`
- Or add navigation link to external blog (blog.gameswithwords.org)

**Question to answer:** Is Updates page separate from Blog, or should we just link to blog?

**Estimated Time:** 1-2 hours (or 15 min if just a link)

#### 2.6 Navigation Updates

**Tasks:**
- Add Blog link in navigation (external: https://blog.gameswithwords.org/)
- Ensure all pages are linked in navigation
- Test navigation on mobile

**Estimated Time:** 30 minutes

**Total Estimated Time for Priority 2:** 8-15 hours

---

### Priority 3: Experiment Migration

**Goal:** Migrate Listener Quiz experiment as proof-of-concept

#### 3.1 Research Phase

**Tasks:**
1. Examine legacy Listener Quiz code (`gww-legacy/experiments/listener-quiz/`)
2. Document experiment structure:
   - jsPsych timeline
   - Stimuli/assets
   - Database schema
   - Worker code (if any)
3. Understand data collection requirements
4. Identify dependencies (Python workers mentioned in legacy repo)

**Estimated Time:** 2-3 hours

#### 3.2 Create New Pushkin Experiment

**Tasks:**
1. Run `pushkin-dev install experiment listener-quiz` in gww-site
2. Choose appropriate template (likely jsPsych-based)
3. Configure experiment in `experiments/` directory

**Estimated Time:** 30 minutes

#### 3.3 Migrate Experiment Code

**Tasks:**
1. Port jsPsych timeline to new experiment
2. Copy stimuli files
3. Update database schema (migrations)
4. Port worker code if needed
5. Test experiment locally:
   ```bash
   pushkin-dev prep
   pushkin-dev start
   ```
6. Verify data collection in local database

**Challenges:**
- Legacy experiment may use Python workers
- Modern Pushkin uses Node.js workers
- May need to rewrite worker logic

**Estimated Time:** 4-8 hours (depends on complexity)

#### 3.4 Deploy Experiment to Test Site

**Tasks:**
1. Commit experiment code
2. Deploy to gww.cherriechang.com:
   ```bash
   pushkin-dev prep
   pushkin-dev aws init
   ```
3. Test experiment on deployed site
4. Verify data saving to RDS database
5. Check CloudWatch logs for errors

**Estimated Time:** 1-2 hours

**Total Estimated Time for Priority 3:** 8-14 hours

---

## Medium-Term Goals (After Core Work)

### Testing & QA (Priority 4)

#### Functional Testing
- [ ] All pages load correctly
- [ ] All navigation links work
- [ ] All modals open and close properly
- [ ] Forms submit correctly (if any)
- [ ] Experiments run and save data
- [ ] External links work (blog, archive)

#### Responsive Testing
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Test on tablet
- [ ] Test on desktop (various screen sizes)
- [ ] Check navigation hamburger menu (if implemented)

#### Browser Compatibility
- [ ] Chrome (Mac/Windows)
- [ ] Safari (Mac/iOS)
- [ ] Firefox
- [ ] Edge

#### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast
- [ ] Alt text on images
- [ ] ARIA labels where needed

#### Performance
- [ ] Page load times
- [ ] Image optimization
- [ ] CloudFront caching working
- [ ] Database query performance

**Estimated Time:** 4-8 hours

---

### Production Deployment (Priority 5)

**Prerequisites:**
- [ ] All content pages complete
- [ ] At least Listener Quiz experiment working
- [ ] Testing complete and issues resolved
- [ ] Team approval to proceed

#### 5.1 Pre-Deployment Preparation

**Tasks:**
1. **Switch AWS accounts:** Configure CLI for lab AWS account
   ```bash
   export AWS_PROFILE=lab-account  # or appropriate profile name
   ```

2. **Update pushkin.yaml:**
   ```yaml
   info:
     rootDomain: gameswithwords.org
     projName: gww-prod
     # Update other settings as needed
   ```

3. **Review and clean up:**
   - Remove any test data
   - Review all content for accuracy
   - Check for any hardcoded URLs pointing to test site

4. **Backup checklist:**
   - Git repository is up to date
   - Document current AWS resources in test account
   - Note database credentials (stored in pushkin.yaml)

**Estimated Time:** 1-2 hours

#### 5.2 Production Deployment

**Tasks:**
1. Deploy to production:
   ```bash
   pushkin-dev prep
   pushkin-dev aws init
   ```

2. Monitor deployment:
   - Watch CloudFormation/ECS console
   - Check for errors
   - Wait for CloudFront deployment (5-15 minutes)

3. Verify infrastructure:
   - RDS databases created
   - ECS services running
   - ALB healthy targets
   - CloudFront distribution active
   - Route53 records created

**Estimated Time:** 2-3 hours (including monitoring)

#### 5.3 DNS Configuration

**Tasks:**
1. Verify Route53 hosted zone for gameswithwords.org
2. Check DNS records:
   - A record or CNAME for gameswithwords.org → CloudFront
   - SSL certificate via ACM
3. Test DNS propagation:
   ```bash
   dig gameswithwords.org
   nslookup gameswithwords.org
   ```
4. Wait for full DNS propagation (up to 48 hours, typically faster)

**Estimated Time:** 1-2 hours

#### 5.4 Post-Deployment Verification

**Tasks:**
1. Access site at https://gameswithwords.org
2. Run through full testing checklist again
3. Test all experiments
4. Verify data collection
5. Check CloudWatch logs for errors
6. Monitor AWS costs (set up billing alarms)

**Estimated Time:** 2-3 hours

#### 5.5 Legacy Site Handling

**Decisions Needed:**
- Keep archive.gameswithwords.org running?
- Redirect old domain to new site?
- Archive old data/content?

**Tasks:**
- Document old infrastructure
- Plan decommissioning timeline (if applicable)
- Set up redirects (if needed)

**Estimated Time:** 1-2 hours

**Total Estimated Time for Priority 5:** 7-12 hours

---

## Long-Term Goals (Post-Production)

### Monitoring & Maintenance

**Set up:**
1. CloudWatch alarms:
   - ECS task failures
   - RDS connection issues
   - High error rates
   - Unusual traffic patterns

2. Uptime monitoring:
   - Use external service (UptimeRobot, Pingdom, etc.)
   - Alert on downtime

3. Cost monitoring:
   - AWS budgets and alerts
   - Monthly cost review

4. Database backups:
   - Verify RDS automated backups
   - Test restore procedure
   - Document backup/restore process

**Estimated Setup Time:** 3-5 hours

---

### Documentation

**For Lab Team:**
1. Deployment procedures
2. How to add new experiments
3. How to update content pages
4. Troubleshooting guide
5. AWS infrastructure overview
6. Database access and queries
7. Cost management

**For Future Developers:**
1. Codebase architecture
2. Pushkin version and customizations
3. Custom components/pages
4. Migration decisions and rationale

**Estimated Time:** 6-10 hours

---

### Additional Experiments

**After Listener Quiz:**
1. Identify next priority experiments
2. Follow same migration process:
   - Research old experiment
   - Create new Pushkin experiment
   - Port code and stimuli
   - Test and deploy

**Per Experiment:** ~8-14 hours (depends on complexity)

---

## Open Questions & Decisions Needed

### Content Questions
1. **Paths page:** What content should this include? Is it a real page or just navigation?
2. **Updates vs Blog:** Are these separate, or should Updates redirect to blog?
3. **Archive scope:** What should be in Archive? Just old experiments or other content?
4. **External experiments:** How to handle Which English and Vocab Quiz (currently on old site)?

### Technical Questions
1. **Python workers:** Listener Quiz uses Python workers - do we need to port to Node.js?
2. **Database migration:** Any existing production data to migrate? (Probably not, fresh start)
3. **Legacy site:** Keep archive.gameswithwords.org running or redirect?
4. **Experiment priority:** Which experiments after Listener Quiz?

### Process Questions
1. **Testing help:** Can you (Cherrie) do testing, or need to involve others?
2. **Content approval:** Who approves page content and design?
3. **Production timeline:** Any deadline or target date?
4. **Team access:** Who needs AWS/GitHub access?

---

## Risk Assessment

### High Risk Items
1. **Uncommitted changes:** Could cause confusion or lost work
   - **Mitigation:** Commit immediately (Priority 1)

2. **Experiment complexity:** Listener Quiz may be more complex than expected
   - **Mitigation:** Timebox research phase, consider simpler experiment first

3. **Production DNS issues:** DNS misconfiguration could cause downtime
   - **Mitigation:** Test with subdomain first, careful DNS review

### Medium Risk Items
1. **Missing content:** Unclear what some pages should contain
   - **Mitigation:** Review legacy site thoroughly, ask lab team

2. **Performance issues:** Site may be slow under load
   - **Mitigation:** Load testing, CloudFront optimization

3. **Cost overruns:** AWS costs may exceed budget
   - **Mitigation:** Set up billing alarms, monitor regularly

### Low Risk Items
1. **Browser compatibility:** Most modern sites work across browsers
   - **Mitigation:** Test on major browsers

2. **Mobile responsiveness:** Bootstrap handles most responsive design
   - **Mitigation:** Test on mobile devices

---

## Success Metrics

### Short-Term (Next 2-3 Weeks)
- [ ] All uncommitted changes committed
- [ ] All content pages built
- [ ] Listener Quiz migrated and working
- [ ] Comprehensive testing complete
- [ ] Site deployed to production

### Medium-Term (1-2 Months)
- [ ] All legacy experiments migrated or documented
- [ ] Monitoring and alerting set up
- [ ] Team trained on maintenance
- [ ] Documentation complete

### Long-Term (3+ Months)
- [ ] Site stable and reliable (>99% uptime)
- [ ] New experiments added
- [ ] Legacy site decommissioned (if applicable)
- [ ] Cost optimized

---

## Estimated Total Time to Production

**Breakdown:**
- Priority 1 (Cleanup): 0.5 hours
- Priority 2 (Content pages): 8-15 hours
- Priority 3 (Listener Quiz): 8-14 hours
- Priority 4 (Testing): 4-8 hours
- Priority 5 (Production deployment): 7-12 hours

**Total:** 27.5 - 49.5 hours

**Calendar Time:**
- If working full-time: 4-7 days
- If working part-time (20hr/week): 1.5-2.5 weeks
- If working alongside other tasks: 2-4 weeks

---

## Recommended Approach

### Session 1: Cleanup & Content Planning (2-3 hours)
1. Commit all outstanding changes
2. Review legacy site to understand remaining pages
3. Answer content questions (Paths, Updates, Archive)
4. Prioritize pages to build

### Session 2-3: Build Content Pages (6-10 hours)
1. Build Quizzes page (will need for experiments)
2. Build Projects page
3. Build Paths page
4. Build Archive and/or Updates page
5. Update navigation with Blog link
6. Test all pages locally

### Session 4-5: Migrate Listener Quiz (8-12 hours)
1. Research legacy experiment
2. Create new Pushkin experiment
3. Port code and stimuli
4. Test locally
5. Deploy to test site
6. Verify data collection

### Session 6: Testing (4-6 hours)
1. Comprehensive functional testing
2. Responsive/mobile testing
3. Browser compatibility
4. Fix any issues found

### Session 7: Production Deployment (4-6 hours)
1. Switch to lab AWS account
2. Update configuration
3. Deploy to production
4. Verify and monitor
5. Team notification

---

## Next Session Checklist

When starting your next session:
1. ✅ Review this document
2. ✅ Check test deployment: https://gww.cherriechang.com
3. ✅ Commit outstanding changes (Priority 1)
4. ✅ Decide on content priorities
5. ✅ Start building pages or migrating experiment

---

## Related Documentation

- [2025-10-14-gww-test-deployment-complete.md](./2025-10-14-gww-test-deployment-complete.md) - What's been completed
- [2025-10-06-lab-site-deployment.md](./2025-10-06-lab-site-deployment.md) - Original deployment plan
- [current-focus.md](./current-focus.md) - Session tracking
- [CLAUDE.local.md](../CLAUDE.local.md) - Overall project context

---

**Document Status:** Ready for next session

**Last Updated:** October 16, 2025
