// 실차에서 확인한 문 방향. 승강장 구조 추정값과 실시간 API 값보다 먼저 쓰입니다.
// 형식: 노선 ID → 역 이름(역·괄호 제외) → { down: "left"|"right", up: "left"|"right" }
//   down = 노선 역 목록의 뒤쪽(2호선은 내선순환) 방향, up = 반대 방향
// 예: L2: { "을지로3가": { down: "right", up: "right" } }
// 앱의 "현장 기록 → 복사하기" 내용을 받아 여기에 옮겨 적습니다.
window.DOOR_OVERRIDES = {
};
