import React, { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { prepareReader } from '../../services/reader';
import { errorMessage } from '../../services/http';
import { LoadState } from '../../component/LoadState';
export function BookLoadingScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'BookLoading'>) {
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    prepareReader(route.params.bookId, route.params.mode).then(result => {
      if (active) navigation.replace('Reader', result);
    }).catch(reason => { if (active) setError(errorMessage(reason)); });
    return () => { active = false; };
  }, [route.params.bookId, route.params.mode, attempt, navigation]);
  return <LoadState message="Đang kiểm tra quyền đọc và tải cấu hình sách..." error={error}
    onRetry={() => setAttempt(x => x + 1)} onBack={navigation.goBack} />;
}
