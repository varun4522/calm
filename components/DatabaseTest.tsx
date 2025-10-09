import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

/**
 * TEMPORARY TESTING COMPONENT
 * Add this to your schedule page temporarily to test database connection
 * 
 * Usage:
 * 1. Import: import DatabaseTest from '../../components/DatabaseTest';
 * 2. Add in render: <DatabaseTest />
 * 3. Run the tests
 * 4. Remove after verification
 */

export default function DatabaseTest() {
  const [status, setStatus] = useState('Not tested');
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);

  const testConnection = async () => {
    try {
      setStatus('Testing connection...');
      
      // Test 1: Check if table exists by trying to select
      const { data, error } = await supabase
        .from('student_schedule')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Connection test error:', error);
        setStatus(`Error: ${error.message}`);
        setTableExists(false);
        Alert.alert(
          'Connection Test Failed',
          `Error: ${error.message}\n\nCheck console for details.`,
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ Connection successful');
      setTableExists(true);
      
      // Test 2: Count rows
      const { count, error: countError } = await supabase
        .from('student_schedule')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Count error:', countError);
      } else {
        setRowCount(count);
        console.log('📊 Total rows:', count);
      }

      setStatus('✅ Connected');
      Alert.alert(
        'Connection Test Successful',
        `✅ Table exists\n📊 Total rows: ${count || 0}`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('❌ Test error:', err);
      setStatus(`Error: ${err}`);
    }
  };

  const testInsert = async () => {
    try {
      setStatus('Testing insert...');
      
      const testData = {
        student_registration: 'TEST_' + Date.now(),
        student_name: 'Test Student',
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00:00',
        end_time: '09:50:00',
        is_available: true
      };

      console.log('📝 Test data:', testData);

      const { data, error } = await supabase
        .from('student_schedule')
        .insert(testData)
        .select();

      if (error) {
        console.error('❌ Insert test error:', error);
        setStatus(`Insert failed: ${error.message}`);
        Alert.alert(
          'Insert Test Failed',
          `Error: ${error.message}\n\nCheck console for details.`,
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ Insert successful:', data);
      setStatus('✅ Insert successful');
      Alert.alert(
        'Insert Test Successful',
        `✅ Test row inserted\n📋 ID: ${data[0]?.id}`,
        [{ text: 'OK' }]
      );

      // Auto-delete test row
      if (data[0]?.id) {
        await supabase
          .from('student_schedule')
          .delete()
          .eq('id', data[0].id);
        console.log('🗑️ Test row cleaned up');
      }
    } catch (err) {
      console.error('❌ Test error:', err);
      setStatus(`Error: ${err}`);
    }
  };

  const viewAllRows = async () => {
    try {
      const { data, error } = await supabase
        .from('student_schedule')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Query error:', error);
        Alert.alert('Query Failed', error.message);
        return;
      }

      console.log('📋 Recent rows:', data);
      Alert.alert(
        'Recent Rows',
        `Found ${data?.length || 0} rows\nCheck console for details`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('❌ Error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Database Test Panel</Text>
      <Text style={styles.status}>Status: {status}</Text>
      
      {tableExists !== null && (
        <Text style={styles.info}>
          Table Exists: {tableExists ? '✅ Yes' : '❌ No'}
        </Text>
      )}
      
      {rowCount !== null && (
        <Text style={styles.info}>
          Total Rows: {rowCount}
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={testConnection}>
        <Text style={styles.buttonText}>1. Test Connection</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testInsert}>
        <Text style={styles.buttonText}>2. Test Insert</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={viewAllRows}>
        <Text style={styles.buttonText}>3. View Recent Rows</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        📝 Check console for detailed logs
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  status: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
  },
});
