# 전략팀 업무 대시보드

전략 과제의 담당·기한·마일스톤과 상부 의견의 전달·반영 상태를 관리합니다. 전략팀의 방향 제시·조율·점검과 실행부서의 구체적 실행안 기획 책임을 구분합니다.

## 사용

[업무 대시보드 열기](https://bp10807-bokyungchoi.github.io/Strategy-Dashboard/)

메인 주소로 접속하면 업무 대시보드가 바로 열립니다. 전체 현황, 실행 과제, 상부 피드백, 회의 및 보고를 사용할 수 있습니다. 실제 업무 공간은 비어 있으며 가상 예시는 별도 체험 모드입니다.

업무 데이터는 각 브라우저의 localStorage에 저장되며 서버 전송·공동 편집은 제공하지 않습니다. 기기 이동·브라우저 데이터 삭제 전 JSON 백업을 보관하세요. 공개 소스에 실제 업무 데이터를 넣지 마세요.

완료에는 완료 기준·근거·실제 완료일이, 피드백 반영 확인에는 개별 완료 기준·반영 근거가 필요합니다. 기한 변경에는 사유와 확정 주체를 기록합니다. 진행 상태와 일정 위험은 구분하며 과제 건수를 전략 성과로 표시하지 않습니다.

## 파일

- `index.html`: 업무 대시보드로 연결
- `strategy-dashboard/`: 앱·스타일·업무 로직·테스트·구현 기록
- `.agents/skills/strategy-team-operations/`: 전략팀 업무 관리 스킬

발표자료는 업무 대시보드와 별도 경로로 공개합니다: [HTML 발표자료](https://bp10807-bokyungchoi.github.io/Strategy-Dashboard/presentation/) · [PowerPoint 다운로드](https://bp10807-bokyungchoi.github.io/Strategy-Dashboard/presentation/strategy-presentation.pptx). 캡처 5장은 가상 예시이며 HTML 안에 포함되어 있습니다. 검토 페이지와 작업본은 배포하지 않습니다.

## 개발·검증

`node --test strategy-dashboard/core.test.js`

일정 경계, 완료 조건, 피드백, 백업·연결·이력, 보고 내용 등 테스트 10개를 제공합니다. 로컬에서는 저장소 폴더에서 `python -m http.server 8000`을 실행하고 `http://localhost:8000`에 접속할 수 있습니다.

GitHub Pages는 공개 저장소 `main` 브랜치의 루트를 사용합니다. 회의록 자동 추출·사내 시스템 연결·권한·서버 저장은 후속 범위입니다.

