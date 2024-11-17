import { ConsultationManager } from './consultation.js';

export function initializeUserInfo() {
    const basicInfoForm = document.getElementById('basicInfoForm');
    const backButton = basicInfoForm.querySelector('.back-button');
    
    backButton.addEventListener('click', () => {
        // 이전 단계로 돌아가기
        document.getElementById('userInfoForm').classList.add('hidden');
        document.getElementById('symptomsGrid').classList.remove('hidden');
        
        // 진행 바 업데이트
        document.querySelectorAll('.step')[1].classList.remove('active');
        document.querySelectorAll('.step')[0].classList.add('active');
    });
    
    basicInfoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 사용자 기본 정보
        const userInfo = {
            gender: document.getElementById('gender').value,
            ageGroup: document.getElementById('ageGroup').value
        };
        
        // 선택한 증상 정보 가져오기
        const selectedSymptom = JSON.parse(sessionStorage.getItem('selectedSymptom') || '{}');
        
        // 전체 상담 데이터 구성
        const consultationData = {
            userInfo,
            symptom: selectedSymptom
        };
        
        // 세션에 전체 데이터 저장
        sessionStorage.setItem('consultationData', JSON.stringify(consultationData));
        
        // 다음 단계(상담)로 이동
        document.getElementById('userInfoForm').classList.add('hidden');
        
        // 진행 바 업데이트
        document.querySelectorAll('.step')[1].classList.remove('active');
        document.querySelectorAll('.step')[2].classList.add('active');
        
        // 상담 시작
        startConsultation(consultationData);
    });
}

function startConsultation(consultationData) {
    // 기존 화면들 숨기기
    document.getElementById('userInfoForm').classList.add('hidden');
    
    // 상담 인터페이스 표시
    const consultationInterface = document.getElementById('consultationInterface');
    consultationInterface.classList.remove('hidden');
    
    // 상담 매니저 초기화
    const consultationManager = new ConsultationManager(consultationData);
} 