import { config } from './config.js';

export class ConsultationManager {
    constructor(consultationData) {
        this.consultationData = consultationData;
        this.chatMessages = [];
        this.messageContainer = document.getElementById('chatMessages');
        this.chatForm = document.getElementById('chatForm');
        this.conversationHistory = [];
        this.threadId = null;
        this.initializeChat();
    }

    getInitialMessage() {
        const { symptom, userInfo } = this.consultationData;
        return `안녕하세요. 저는 한의학 상담 AI입니다.
                ${userInfo.ageGroup}대 ${userInfo.gender === 'male' ? '남성' : '여성'}분의
                ${symptom.mainCategory.name} 중 ${symptom.subCategory.name} 증상에 대해 상담을 시작하겠습니다.
                
                먼저, ${symptom.subCategory.name} 증상이 언제부터 시작되었는지 알려주시겠어요?`;
    }

    async initializeChat() {
        try {
            const threadResponse = await fetch('/api/openai/threads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.openai.apiKey}`,
                    'OpenAI-Beta': 'assistants=v1',
                    'Content-Type': 'application/json'
                }
            });

            if (!threadResponse.ok) {
                throw new Error('스레드 생성 실패');
            }

            const thread = await threadResponse.json();
            this.threadId = thread.id;
            console.log('스레드 생성 성공:', thread);

            const initialMessage = this.getInitialMessage();
            this.addSystemMessage(initialMessage);
            await this.sendMessage(initialMessage);

            this.chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const userInput = document.getElementById('userInput');
                const message = userInput.value.trim();
                if (message) {
                    await this.handleUserInput(message);
                    userInput.value = '';
                }
            });
        } catch (error) {
            console.error('상담 초기화 중 오류:', error);
            this.addSystemMessage('상담 초기화 중 문제가 발생했습니다.');
        }
    }

    async handleUserInput(message) {
        const userInput = document.getElementById('userInput');
        const currentMessage = message;  // 현재 메시지 저장
        userInput.value = '';  // 입력 필드 초기화
        
        this.addUserMessage(currentMessage);
        await this.sendMessage(currentMessage);
    }

    async sendMessage(message) {
        try {
            const messageResponse = await fetch(`/api/openai/threads/${this.threadId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.openai.apiKey}`,
                    'OpenAI-Beta': 'assistants=v1',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: 'user',
                    content: message
                })
            });

            if (!messageResponse.ok) {
                throw new Error('메시지 전송 실패');
            }

            const runResponse = await fetch(`/api/openai/threads/${this.threadId}/runs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.openai.apiKey}`,
                    'OpenAI-Beta': 'assistants=v1',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    assistant_id: config.openai.assistantId,
                    instructions: `지금까지의 대화 내용을 분석하여 다음을 판단해주세요:
                        1. 충분한 정보가 수집되었는지
                        2. 추가 질문이 필요한지
                        3. 최종 진단과 제안을 할 시점인지

                        충분한 정보가 수집되었다면 "지금까지의 상담 내용을 바탕으로 종합적인 진단과 제안을 해드리겠습니다."라고 말한 후,
                        다음 JSON 형식으로 결과를 제시해주세요:
                        {
                            "consultationResult": {
                                "mainSymptom": "주요 증상",
                                "duration": "증상 지속 기간",
                                "characteristics": ["증상의 특징들"],
                                "diagnosis": {
                                    "koreanMedicine": "한의학적 진단",
                                    "possibleCauses": ["추정되는 원인들"]
                                },
                                "recommendations": {
                                    "acupuncturePoints": ["추천 혈자리"],
                                    "lifestyle": ["생활 습관 개선 사항"],
                                    "exercises": ["추천 운동"],
                                    "dietary": ["식이 조절 사항"],
                                    "cautions": ["주의사항"]
                                }
                            }
                        }`
                })
            });

            if (!runResponse.ok) {
                throw new Error('실행 시작 실패');
            }

            const run = await runResponse.json();
            const response = await this.waitForCompletion(run.id);

            // 응답에 JSON 형식의 결과가 포함되어 있는지 확인
            if (response.includes("종합적인 진단과 제안")) {
                try {
                    // JSON 부분 추출
                    const jsonStart = response.indexOf('{');
                    const jsonEnd = response.lastIndexOf('}') + 1;
                    const jsonStr = response.substring(jsonStart, jsonEnd);
                    const resultData = JSON.parse(jsonStr);

                    // 일반 메시지 부분 표시
                    const messageText = response.substring(0, jsonStart).trim();
                    this.addSystemMessage(messageText);

                    // 결과 페이지 표시
                    this.showConsultationResult(resultData);
                } catch (e) {
                    console.error('결과 파싱 오류:', e);
                    this.addSystemMessage(response);
                }
            } else {
                this.addSystemMessage(response);
            }
        } catch (error) {
            console.error('메시지 처리 중 오류:', error);
            this.addSystemMessage('응답 처리 중 문제가 발생했습니다.');
        }
    }

    async waitForCompletion(runId) {
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(
                    `/api/openai/threads/${this.threadId}/runs/${runId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${config.openai.apiKey}`,
                            'OpenAI-Beta': 'assistants=v1'
                        }
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('실행 상태 확인 응답:', errorData);
                    throw new Error(`실행 상태 확인 실패: ${errorData.error?.message}`);
                }

                const run = await response.json();
                console.log('실행 상태:', run.status);

                if (run.status === 'completed') {
                    const messagesResponse = await fetch(
                        `/api/openai/threads/${this.threadId}/messages`,
                        {
                            headers: {
                                'Authorization': `Bearer ${config.openai.apiKey}`,
                                'OpenAI-Beta': 'assistants=v1'
                            }
                        }
                    );

                    if (!messagesResponse.ok) {
                        const errorData = await messagesResponse.json();
                        console.error('메시지 가져오기 응답:', errorData);
                        throw new Error(`메시지 가져오기 실패: ${errorData.error?.message}`);
                    }

                    const messages = await messagesResponse.json();
                    return messages.data[0].content[0].text.value;
                }

                if (run.status === 'failed') {
                    console.error('실행 실패 상세:', run);
                    throw new Error(`GPT 실행 실패: ${run.last_error?.message || '알 수 없는 오류'}`);
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
                console.log(`실행 대기 중... (${attempts}/${maxAttempts})`);

            } catch (error) {
                console.error('대기 중 오류:', error);
                throw error;
            }
        }

        throw new Error('시간 초과: 응답을 받지 못했습니다.');
    }

    addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-message';
        messageElement.textContent = message;
        this.messageContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        messageElement.textContent = message;
        this.messageContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    finishConsultation() {
        this.chatForm.style.display = 'none';
        
        this.addSystemMessage('\n상담이 종료되었습니다. 더 자세한 상담을 원하시면 한의원에 내원해주세요.');
    }

    scrollToBottom() {
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }

    showConsultationResult(resultData) {
        // 채팅 인터페이스 숨기기
        this.chatForm.style.display = 'none';
        
        // 결과 화면 생성
        const resultContainer = document.createElement('div');
        resultContainer.className = 'consultation-result';
        
        resultContainer.innerHTML = `
            <h2>한의학 진단 결과</h2>
            
            <section class="result-section diagnosis">
                <h3>진단 결과</h3>
                <div class="diagnosis-content">
                    <div class="main-diagnosis">
                        <h4>한의학적 진단</h4>
                        <p>${resultData.consultationResult.diagnosis.koreanMedicine}</p>
                    </div>
                    <div class="symptoms-analysis">
                        <h4>증상 분석</h4>
                        <ul>
                            ${resultData.consultationResult.characteristics.map(c => `<li>${c}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="causes">
                        <h4>추정되는 원인</h4>
                        <ul>
                            ${resultData.consultationResult.diagnosis.possibleCauses.map(c => `<li>${c}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </section>

            <section class="result-section treatment">
                <h3>치료 권장사항</h3>
                <div class="treatment-content">
                    <div class="acupuncture">
                        <h4>추천 침치료 부위</h4>
                        <div class="acupoints">
                            ${resultData.consultationResult.recommendations.acupuncturePoints.map(p => `
                                <div class="acupoint">
                                    <span class="point-name">${p}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="lifestyle">
                        <h4>생활 관리</h4>
                        <div class="lifestyle-recommendations">
                            <div class="daily-habits">
                                <h5>일상 생활 개선</h5>
                                <ul>
                                    ${resultData.consultationResult.recommendations.lifestyle.map(l => `<li>${l}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="exercise">
                                <h5>운동 관리</h5>
                                <ul>
                                    ${resultData.consultationResult.recommendations.exercises.map(e => `<li>${e}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="diet">
                        <h4>식이 관리</h4>
                        <ul>
                            ${resultData.consultationResult.recommendations.dietary.map(d => `<li>${d}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </section>

            <section class="result-section mental-health">
                <h3>정신 건강 관리</h3>
                <div class="mental-health-content">
                    <ul>
                        ${resultData.consultationResult.recommendations.mentalHealth ? 
                            resultData.consultationResult.recommendations.mentalHealth.map(m => `<li>${m}</li>`).join('') :
                            '<li>스트레스 관리와 충분한 휴식을 취하세요.</li>'}
                    </ul>
                </div>
            </section>

            <section class="result-section cautions">
                <h3>주의사항</h3>
                <ul>
                    ${resultData.consultationResult.recommendations.cautions.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </section>

            <div class="disclaimer">
                <p>* 이 진단 결과는 참고용이며, 정확한 진단과 치료를 위해서는 반드시 한의원에 내원하시기를 권장드립니다.</p>
                <p>* 증상이 심각하거나 지속될 경우 전문의와 상담하시기 바랍니다.</p>
            </div>
        `;

        // 결과 화면에 스타일 클래스 추가
        resultContainer.querySelectorAll('section').forEach(section => {
            section.classList.add('fade-in');
        });

        // 결과 화면 표시
        this.messageContainer.appendChild(resultContainer);
        this.scrollToBottom();
        
        // 진행 바 업데이트 - "상담"에서 "결과"로 변경
        const steps = document.querySelectorAll('.step');
        steps[2].classList.remove('active');
        steps[3].classList.add('active');
    }
}

export async function handleConsultation(symptom) {
    try {
        console.log('상담 요청된 증상:', symptom);
        return {
            success: true,
            message: "상담 요청이 처리되었습니다.",
            data: {
                symptom: symptom.name,
                category: symptom.category,
                recommendation: "임시 추천 사항입니다."
            }
        };
    } catch (error) {
        console.error('상담 처리 중 오류:', error);
        showErrorMessage('상담 중 문제가 발생했습니다. 다시 시도해주세요.');
        throw error;
    }
}

export function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
} 