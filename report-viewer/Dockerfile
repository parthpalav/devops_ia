# Serves ./artifacts (bind-mounted read-only at /usr/share/nginx/html/reports) plus a small landing page.
# No Node.js or Playwright is needed on the host to browse the HTML reports, screenshots, videos and traces.
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
